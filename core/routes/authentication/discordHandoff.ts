const modulename = 'WebServer:AuthDiscordHandoff';
import crypto from 'node:crypto';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import { AuthedAdmin, DiscordSessAuthType } from '@modules/WebServer/authLogic';
import { z } from 'zod';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/*
 * AusNetworks addition: single sign-on handoff from the main website.
 *
 * All Discord OAuth happens on ausnetworks.net, which owns the one Discord
 * application and the one callback URL. Once an admin is logged in there,
 * the site mints a short-lived signed token asserting their Discord ID and
 * sends the browser here.
 *
 * The token is HMAC-SHA256 signed with a secret shared only between the web
 * backend and this host, so this is NOT header trust: a forged assertion
 * requires the secret. txAdmin still enforces its own allowlist afterwards -
 * a valid token for a Discord ID that is not on an admin account grants
 * nothing.
 *
 * Token format:  base64url(JSON payload) + "." + base64url(HMAC)
 * Payload:       { discordId: string, exp: number (unix ms), nonce: string }
 */

const MAX_TOKEN_LIFETIME_MS = 120_000; //reject anything minted to last longer
const NONCE_RETENTION_MS = 300_000;

const payloadSchema = z.object({
    discordId: z.string().regex(/^\d{17,20}$/, 'not a discord snowflake'),
    exp: z.number().int().positive(),
    nonce: z.string().min(8).max(128),
});

//Single-use enforcement. Bounded by pruning on every insert, so a flood of
//tokens cannot grow this without limit beyond the retention window.
const usedNonces = new Map<string, number>();
const consumeNonce = (nonce: string): boolean => {
    const now = Date.now();
    for (const [k, seenAt] of usedNonces) {
        if (now - seenAt > NONCE_RETENTION_MS) usedNonces.delete(k);
    }
    if (usedNonces.has(nonce)) return false;
    usedNonces.set(nonce, now);
    return true;
};

const b64uDecode = (input: string) => Buffer.from(input, 'base64url');

const fail = (ctx: InitializedCtx, reason: string, logMsg?: string) => {
    console.warn(`Discord handoff rejected: ${logMsg ?? reason}`);
    ctx.sessTools.destroy();
    ctx.status = 403;
    //Deliberately vague to the browser; detail goes to the server log only.
    return ctx.body = { error: reason };
};

export default async function AuthDiscordHandoff(ctx: InitializedCtx) {
    const secret = process.env.TXADMIN_HANDOFF_SECRET;
    if (!secret || secret.length < 32) {
        return fail(ctx, 'sso_not_configured',
            'TXADMIN_HANDOFF_SECRET is unset or shorter than 32 chars.');
    }

    const token = ctx.request.query?.token;
    if (typeof token !== 'string' || !token.includes('.')) {
        return fail(ctx, 'invalid_token', 'missing or malformed token param');
    }

    const [payloadPart, sigPart] = token.split('.', 2);

    //Verify signature before parsing anything from the payload.
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadPart).digest();
    const providedSig = b64uDecode(sigPart);
    if (
        providedSig.length !== expectedSig.length
        || !crypto.timingSafeEqual(providedSig, expectedSig)
    ) {
        return fail(ctx, 'invalid_token', 'signature mismatch');
    }

    let payload;
    try {
        payload = payloadSchema.parse(JSON.parse(b64uDecode(payloadPart).toString('utf8')));
    } catch (error) {
        return fail(ctx, 'invalid_token', `payload: ${(error as Error).message}`);
    }

    const now = Date.now();
    if (payload.exp <= now) {
        return fail(ctx, 'token_expired', `expired ${now - payload.exp}ms ago`);
    }
    if (payload.exp - now > MAX_TOKEN_LIFETIME_MS) {
        return fail(ctx, 'invalid_token', 'token lifetime exceeds the 120s maximum');
    }
    if (!consumeNonce(payload.nonce)) {
        return fail(ctx, 'token_replayed', `nonce reused: ${payload.nonce}`);
    }

    //The allowlist: the Discord ID must be on an existing txAdmin admin.
    //A valid token alone is not authorization.
    const identifier = `discord:${payload.discordId}`;
    const vaultAdmin = txCore.adminStore.getAdminByIdentifiers([identifier]);
    if (!vaultAdmin) {
        return fail(ctx, 'not_admin', `no admin carries ${identifier}`);
    }

    const sessData = {
        type: 'discord',
        username: vaultAdmin.name,
        csrfToken: txCore.adminStore.genCsrfToken(),
        expiresAt: now + 86_400_000, //24h
        identifier,
    } satisfies DiscordSessAuthType;
    ctx.sessTools.set({ auth: sessData });

    const authedAdmin = new AuthedAdmin(vaultAdmin, sessData.csrfToken);
    authedAdmin.logAction(`logged in from ${ctx.ip} via website discord SSO`);
    txCore.metrics.txRuntime.loginOrigins.count(ctx.txVars.hostType);
    txCore.metrics.txRuntime.loginMethods.count('discord');

    return ctx.redirect('/');
};
