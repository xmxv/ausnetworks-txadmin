const modulename = 'AdminStore:DiscordProvider';
import crypto from 'node:crypto';
import { URL, URLSearchParams } from 'node:url';
import got from '@lib/got';
import { z } from 'zod';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

/*
 * AusNetworks addition.
 *
 * Discord OAuth2 login provider, mirroring the shape of CitizenFX.ts so the
 * two can be used interchangeably by the auth routes.
 *
 * Discord is plain OAuth2, not OpenID Connect - it exposes no discovery
 * document and issues no id_token by default - so `openid-client` (used by
 * the CitizenFX provider) is not usable here. The three calls are made
 * directly instead.
 *
 * Admin matching needs no special handling: AdminStore.getAdminByIdentifiers()
 * compares against every provider's `identifier` string, and txAdmin already
 * stores Discord admins as `discord:<snowflake>`. An admin can therefore log
 * in with Discord as soon as their Discord ID is set on their account.
 */

const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const USERINFO_URL = 'https://discord.com/api/users/@me';
const SCOPE = 'identify';

const tokenResponseSchema = z.object({
    access_token: z.string().min(1),
    token_type: z.string().optional(),
    expires_in: z.number().optional(),
});

const userInfoSchema = z.object({
    id: z.string().regex(/^\d{17,20}$/, 'not a discord snowflake'),
    username: z.string().min(1),
    global_name: z.string().nullish(),
    avatar: z.string().nullish(),
});

export type DiscordUserInfoType = {
    /** Raw snowflake, e.g. "272800000000000000" */
    id: string;
    /** Display name, for logging and the "not an admin" error screen */
    name: string;
    /** txAdmin admin identifier, e.g. "discord:272800000000000000" */
    identifier: string;
    picture: string | undefined;
};

/**
 * Derives the OAuth `state` value from the per-session random kern.
 * Same construction as the CitizenFX provider so the CSRF property is
 * identical: the value in the callback must match one derived from a secret
 * held only in the caller's session.
 */
const getOauthState = (stateKern: string) => {
    const stateSeed = `tx:discord:${stateKern}`;
    return crypto.createHash('SHA1').update(stateSeed).digest('hex');
};


export default class DiscordProvider {
    private readonly clientId: string;
    private readonly clientSecret: string;
    public readonly ready: boolean;

    constructor() {
        //Credentials come from the environment so they never enter the repo.
        //See ops/discord-oauth.env.example and the start scripts.
        this.clientId = process.env.TXADMIN_DISCORD_CLIENT_ID ?? '';
        this.clientSecret = process.env.TXADMIN_DISCORD_CLIENT_SECRET ?? '';
        this.ready = !!(this.clientId && this.clientSecret);
        if (!this.ready) {
            console.verbose.warn('Discord login disabled: TXADMIN_DISCORD_CLIENT_ID/SECRET not set.');
        }
    }

    private assertReady() {
        if (!this.ready) {
            throw new Error('Discord login is not configured on this server.');
        }
    }

    /**
     * Returns the Discord authorization URL to redirect the admin to.
     */
    getAuthURL(redirectUri: string, stateKern: string) {
        this.assertReady();
        const url = new URL(AUTHORIZE_URL);
        url.searchParams.set('client_id', this.clientId);
        url.searchParams.set('redirect_uri', redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', SCOPE);
        url.searchParams.set('state', getOauthState(stateKern));
        //Always re-prompt so a shared browser cannot silently reuse a session.
        url.searchParams.set('prompt', 'consent');
        return url.toString();
    }


    /**
     * Validates the callback state and exchanges the code for an access token.
     * `sessionCallbackUri` must be the exact redirect_uri used in getAuthURL,
     * as Discord requires them to match.
     */
    async processCallback(sessionCallbackUri: string, sessionStateKern: string, callbackUri: string) {
        this.assertReady();

        const parsedUri = new URL(callbackUri);
        const callbackCode = parsedUri.searchParams.get('code');
        const callbackState = parsedUri.searchParams.get('state');
        if (typeof callbackCode !== 'string') throw new Error('code not present');
        if (typeof callbackState !== 'string') throw new Error('state not present');

        //CSRF check. Constant-time compare to avoid leaking the expected value.
        const expectedState = getOauthState(sessionStateKern);
        const gotBuf = Buffer.from(callbackState);
        const expBuf = Buffer.from(expectedState);
        if (gotBuf.length !== expBuf.length || !crypto.timingSafeEqual(gotBuf, expBuf)) {
            throw new Error('state mismatch');
        }

        const res = await got.post(TOKEN_URL, {
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'authorization_code',
                code: callbackCode,
                redirect_uri: sessionCallbackUri,
            }).toString(),
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            timeout: { request: 10_000 },
        }).json();

        return tokenResponseSchema.parse(res);
    }


    /**
     * Fetches the Discord user behind an access token.
     */
    async getUserInfo(accessToken: string): Promise<DiscordUserInfoType> {
        this.assertReady();

        const res = await got(USERINFO_URL, {
            headers: { authorization: `Bearer ${accessToken}` },
            timeout: { request: 10_000 },
        }).json();

        const user = userInfoSchema.parse(res);
        const picture = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : undefined;

        return {
            id: user.id,
            name: user.global_name || user.username,
            identifier: `discord:${user.id}`,
            picture,
        };
    }
};
