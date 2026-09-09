const modulename = 'WebServer:AuthDiscordRedirect';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import { ApiOauthRedirectResp } from '@shared/authApiTypes';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

const querySchema = z.object({
    origin: z.string(),
});

/**
 * AusNetworks addition.
 * Generates the Discord auth url and returns it for the panel to redirect to.
 */
export default async function AuthDiscordRedirect(ctx: InitializedCtx) {
    const schemaRes = querySchema.safeParse(ctx.request.query);
    if (!schemaRes.success) {
        return ctx.send<ApiOauthRedirectResp>({
            error: `Invalid request query: ${schemaRes.error.message}`,
        });
    }
    const { origin } = schemaRes.data;

    if (!txCore.adminStore.hasAdmins()) {
        return ctx.send<ApiOauthRedirectResp>({ error: 'no_admins_setup' });
    }

    const provider = txCore.adminStore.providers.discord;
    if (!provider || !provider.ready) {
        return ctx.send<ApiOauthRedirectResp>({
            error: 'Discord login is not configured on this server.',
        });
    }

    //redirect_uri must match byte-for-byte between here and the code
    //exchange, and must be registered on the Discord application.
    const callbackUrl = origin + '/auth/discord/callback';
    const stateKern = randomUUID();
    ctx.sessTools.set({
        tmpOauthLoginStateKern: stateKern,
        tmpOauthLoginCallbackUri: callbackUrl,
    });

    try {
        return ctx.send<ApiOauthRedirectResp>({
            authUrl: provider.getAuthURL(callbackUrl, stateKern),
        });
    } catch (error) {
        return ctx.send<ApiOauthRedirectResp>({
            error: (error as Error).message,
        });
    }
};
