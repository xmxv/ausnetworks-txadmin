const modulename = 'WebServer:AuthDiscordCallback';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import { AuthedAdmin, DiscordSessAuthType } from '@modules/WebServer/authLogic';
import { ApiOauthCallbackResp, ReactAuthDataType } from '@shared/authApiTypes';
import { z } from 'zod';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

const bodySchema = z.object({
    redirectUri: z.string(),
});

/**
 * AusNetworks addition.
 * Handles the Discord OAuth callback: exchanges the code, resolves the
 * Discord user to a txAdmin admin, and establishes the session.
 */
export default async function AuthDiscordCallback(ctx: InitializedCtx) {
    const schemaRes = bodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Invalid request body',
            errorMessage: schemaRes.error.message,
        });
    }
    const { redirectUri } = schemaRes.data;

    const provider = txCore.adminStore.providers.discord;
    if (!provider || !provider.ready) {
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Discord login unavailable',
            errorMessage: 'Discord login is not configured on this server.',
        });
    }

    //The state kern and callback uri must come from the session, not the
    //request, or the CSRF check would be meaningless.
    const inboundSession = ctx.sessTools.get();
    if (!inboundSession?.tmpOauthLoginStateKern || !inboundSession?.tmpOauthLoginCallbackUri) {
        return ctx.send<ApiOauthCallbackResp>({ errorCode: 'invalid_session' });
    }

    //Exchange the code
    let tokenSet;
    try {
        tokenSet = await provider.processCallback(
            inboundSession.tmpOauthLoginCallbackUri,
            inboundSession.tmpOauthLoginStateKern,
            redirectUri,
        );
    } catch (e) {
        const error = e as any;
        console.warn(`Discord code exchange error: ${error.message}`);
        if (error.message === 'state mismatch') {
            return ctx.send<ApiOauthCallbackResp>({ errorCode: 'invalid_state' });
        } else if (error.code === 'ETIMEDOUT') {
            return ctx.send<ApiOauthCallbackResp>({ errorCode: 'timeout' });
        }
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Discord code exchange error:',
            errorMessage: error.message,
        });
    }

    //Resolve the Discord user
    let userInfo;
    try {
        userInfo = await provider.getUserInfo(tokenSet.access_token);
    } catch (error) {
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Discord user info error:',
            errorMessage: (error as Error).message,
        });
    }

    try {
        //This is the allowlist: only an existing admin carrying this exact
        //Discord identifier can log in. Being in the Discord guild, or
        //passing an upstream web gate, is not by itself sufficient.
        const vaultAdmin = txCore.adminStore.getAdminByIdentifiers([userInfo.identifier]);
        if (!vaultAdmin) {
            ctx.sessTools.destroy();
            return ctx.send<ApiOauthCallbackResp>({
                errorCode: 'not_admin',
                errorContext: {
                    identifier: userInfo.identifier,
                    name: userInfo.name,
                    profile: `https://discord.com/users/${userInfo.id}`,
                },
            });
        }

        const sessData = {
            type: 'discord',
            username: vaultAdmin.name,
            csrfToken: txCore.adminStore.genCsrfToken(),
            expiresAt: Date.now() + 86_400_000, //24h
            identifier: userInfo.identifier,
        } satisfies DiscordSessAuthType;
        ctx.sessTools.set({ auth: sessData });

        if (userInfo.picture) {
            txCore.cacheStore.set(`admin:picture:${vaultAdmin.name}`, userInfo.picture);
        }

        const authedAdmin = new AuthedAdmin(vaultAdmin, sessData.csrfToken);
        authedAdmin.logAction(`logged in from ${ctx.ip} via discord auth`);
        txCore.metrics.txRuntime.loginOrigins.count(ctx.txVars.hostType);
        txCore.metrics.txRuntime.loginMethods.count('discord');
        return ctx.send<ReactAuthDataType>(authedAdmin.getAuthData());
    } catch (error) {
        ctx.sessTools.destroy();
        console.verbose.error(`Failed to login via discord: ${(error as Error).message}`);
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Failed to login:',
            errorMessage: (error as Error).message,
        });
    }
};
