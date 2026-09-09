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
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000; //8h
const NONCE_RETENTION_MS = 300_000;

const payloadSchema = z.object({
    discordId: z.string().regex(/^\d{17,20}$/, 'not a discord snowflake'),
    exp: z.number().int().positive(),
    nonce: z.string().min(8).max(128),
    //Optional audience: binds a token to one instance. The nonce cache is
    //per-process, so without this a token could be spent once on dev AND once
    //on prod inside its validity window. Optional so the website can adopt it
    //without a lockstep deploy; enforced whenever present.
    aud: z.string().min(1).max(32).optional(),
});

//Which instance this process is. Set by the launchers.
const INSTANCE_ID = process.env.TXADMIN_INSTANCE_ID || '';

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

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
));

/**
 * Rejection page, in the AusNetworks palette.
 *
 * Admins arrive here by clicking a link on the website, so a raw JSON body is
 * a dead end for a real person. Only the not_admin case names the identifier -
 * it is the one failure a user can fix themselves, by asking for that ID to be
 * added. Every other reason stays vague to the browser, with detail in the log.
 */
const failPage = (title: string, message: string, discordId?: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} &middot; AusNetworks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:1.5rem;
    background:#000; color:#f5f5f5; font:400 15px/1.6 Inter, system-ui, sans-serif; }
  .card { max-width:34rem; width:100%; padding:2rem;
    background:linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012));
    border:1px solid #1f1f1f; border-radius:1.25rem;
    box-shadow:0 1px 0 rgba(255,255,255,.02) inset; }
  .eyebrow { font-size:11.5px; font-weight:600; letter-spacing:.2em; text-transform:uppercase;
    color:#00d2b4; margin:0 0 .75rem; }
  h1 { font-size:30px; font-weight:600; letter-spacing:-.02em; margin:0 0 .5rem; }
  .rule { height:1px; margin:1.25rem 0; opacity:.4;
    background:linear-gradient(90deg, transparent, #00d2b4 20%, #2ee08a 40%, #ff2d92 70%, #ff8a1f 85%, transparent); }
  p { color:#8b8b8b; margin:0 0 1rem; }
  code { font-family:'JetBrains Mono', ui-monospace, monospace; font-size:13.5px;
    color:#f5f5f5; background:rgba(0,0,0,.4); border:1px solid #1f1f1f;
    border-radius:.625rem; padding:.5rem .75rem; display:inline-block; }
  a.btn { display:inline-block; margin-top:.5rem; padding:.6rem 1.1rem; border-radius:.75rem;
    font-weight:600; font-size:14px; color:#000; text-decoration:none;
    background:linear-gradient(92deg,#00d2b4 0%,#2ee08a 35%,#ff2d92 75%,#ff8a1f 100%); }
</style></head>
<body><main class="card">
  <p class="eyebrow">Access denied</p>
  <h1>${escapeHtml(title)}</h1>
  <div class="rule"></div>
  <p>${message}</p>
  ${discordId ? `<p><code>discord:${escapeHtml(discordId)}</code></p>` : ''}
  <a class="btn" href="https://ausnetworks.net/admin">Back to the admin panel</a>
</main></body></html>`;

const fail = (ctx: InitializedCtx, reason: string, logMsg?: string, discordId?: string) => {
    console.warn(`Discord handoff rejected: ${logMsg ?? reason}`);
    ctx.sessTools.destroy();
    ctx.status = 403;

    //Serve HTML to browsers, JSON to anything scripted (the website's probes).
    const wantsHtml = (ctx.headers.accept ?? '').includes('text/html');
    if (!wantsHtml) return ctx.body = { error: reason };

    ctx.type = 'html';
    if (reason === 'not_admin') {
        return ctx.body = failPage(
            'You are not an admin on this server',
            'Your Discord account signed in correctly, but it is not on this '
            + 'panel&rsquo;s admin list. Dev and production keep separate lists, '
            + 'so access to one does not grant the other. Ask an existing admin '
            + 'to add the ID below.',
            discordId,
        );
    }
    return ctx.body = failPage(
        'That sign-in link is not valid',
        'The link has expired, been used already, or was not issued by '
        + 'ausnetworks.net. Return to the admin panel and click through again '
        + '&mdash; links are single-use and short-lived by design.',
    );
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

    //Audience binding. Only enforced when the token carries one.
    if (payload.aud && INSTANCE_ID && payload.aud !== INSTANCE_ID) {
        return fail(ctx, 'wrong_instance',
            `token audience '${payload.aud}' does not match this instance '${INSTANCE_ID}'`);
    }

    //The allowlist: the Discord ID must be on an existing txAdmin admin.
    //A valid token alone is not authorization.
    const identifier = `discord:${payload.discordId}`;
    const vaultAdmin = txCore.adminStore.getAdminByIdentifiers([identifier]);
    if (!vaultAdmin) {
        return fail(ctx, 'not_admin', `no admin carries ${identifier}`, payload.discordId);
    }

    const sessData = {
        type: 'discord',
        username: vaultAdmin.name,
        csrfToken: txCore.adminStore.genCsrfToken(),
        expiresAt: now + SESSION_LIFETIME_MS,
        identifier,
    } satisfies DiscordSessAuthType;
    ctx.sessTools.set({ auth: sessData });

    const authedAdmin = new AuthedAdmin(vaultAdmin, sessData.csrfToken);
    authedAdmin.logAction(`logged in from ${ctx.ip} via website discord SSO`);
    txCore.metrics.txRuntime.loginOrigins.count(ctx.txVars.hostType);
    txCore.metrics.txRuntime.loginMethods.count('discord');

    return ctx.redirect('/');
};
