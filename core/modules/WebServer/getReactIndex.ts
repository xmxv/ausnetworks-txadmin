const modulename = 'WebCtxUtils';
import fsp from "node:fs/promises";
import path from "node:path";
import type { InjectedTxConsts, ThemeType } from '@shared/otherTypes';
import { txEnv, txDevEnv, txHostConfig } from "@core/globalData";
import { AuthedCtx, CtxWithVars } from "./ctxTypes";
import consts from "@shared/consts";
import consoleFactory from '@lib/console';
import { isDirectLocalRequest } from '@lib/isDirectLocalRequest';
import { ausnetworksBrandCss } from './ausnetworksBrand';
import { AuthedAdminType, checkRequestAuth } from "./authLogic";
import { isString } from "@modules/CacheStore";
import {
    escapeHtmlAttribute,
    escapeHtmlRawText,
    sanitizeClassToken,
    sanitizeCssVarName,
    sanitizeCssVarValue,
} from "@lib/htmlRenderSafety";
const console = consoleFactory(modulename);

// NOTE: it's not possible to remove the hardcoded import of the entry point in the index.html file
// even if you set the entry point manually in the vite config.
// Therefore, it was necessary to tag it with `data-prod-only` so it can be removed in dev mode.

//Consts
const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

//Cache the index.html file unless in dev mode
let htmlFile: string;

// NOTE: https://vitejs.dev/guide/backend-integration.html
const viteOrigin = txDevEnv.VITE_URL ?? 'doesnt-matter';
const devModulesScript = `<script type="module">
        import { injectIntoGlobalHook } from "${viteOrigin}/@react-refresh";
        injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module" src="${viteOrigin}/@vite/client"></script>
    <script type="module" src="${viteOrigin}/src/main.tsx"></script>`;


//Custom themes placeholder
export const tmpDefaultTheme = 'ausnetworks';
export const tmpDefaultThemes = ['dark', 'light'];
export const tmpCustomThemes: ThemeType[] = [
    //AusNetworks brand theme. Values are taken directly from the palette in
    //ausnetworks.net's stylesheet (--color-bg, --color-teal, etc.) and
    //converted to the "H S% L%" triplets txAdmin expects, so the panel and
    //the website stay in step. Update both together if the brand changes.
    {
        name: 'ausnetworks',
        isDark: true,
        style: {
            //Surfaces: near-black, matching --color-bg / --color-surface*
            "background": "0 0% 0%",
            "foreground": "0 0% 96.1%",
            "card": "0 0% 3.9%",
            "card-foreground": "0 0% 96.1%",
            "popover": "0 0% 6.7%",
            "popover-foreground": "0 0% 96.1%",

            //Primary: the site's teal accent (#00d2b4). Foreground is near
            //black because white text on this teal fails contrast.
            "primary": "171.4 100% 41.2%",
            "primary-foreground": "0 0% 4%",

            "secondary": "0 0% 9%",
            "secondary-foreground": "0 0% 96.1%",
            "muted": "0 0% 12.2%",
            "muted-foreground": "0 0% 54.5%",
            "accent": "0 0% 12.2%",
            "accent-foreground": "0 0% 96.1%",

            //Lines and controls: --color-line / --color-line-2
            "border": "0 0% 12.2%",
            "input": "0 0% 16.5%",
            "ring": "171.4 100% 41.2%",

            //Status colours, all from the site palette
            "destructive": "359.3 100% 65.1%",
            "destructive-foreground": "0 0% 96.1%",
            "destructive-hint": "359.3 40% 14%",
            "destructive-inline": "359.3 100% 72%",

            "success": "151 74.2% 52.9%",
            "success-foreground": "0 0% 4%",
            "success-hint": "151 40% 12%",
            "success-inline": "151 74.2% 60%",

            "warning": "38.7 100% 56.3%",
            "warning-foreground": "0 0% 4%",
            "warning-hint": "38.7 40% 13%",
            "warning-inline": "38.7 100% 63%",

            "info": "234.9 85.6% 64.7%",
            "info-foreground": "0 0% 96.1%",
            "info-hint": "234.9 40% 16%",
            "info-inline": "234.9 85.6% 72%",
        }
    }
];



/**
 * Returns the react index.html file with placeholders replaced
 * FIXME: add favicon
 */
export default async function getReactIndex(ctx: CtxWithVars | AuthedCtx) {
    //Read file if not cached
    if (txDevEnv.ENABLED || !htmlFile) {
        try {
            const indexPath = txDevEnv.ENABLED
                ? path.join(txDevEnv.SRC_PATH, '/panel/index.html')
                : path.join(txEnv.txaPath, 'panel/index.html')
            const rawHtmlFile = await fsp.readFile(indexPath, 'utf-8');

            //Remove tagged lines (eg hardcoded entry point) depending on env
            if (txDevEnv.ENABLED) {
                htmlFile = rawHtmlFile.replaceAll(/.+data-prod-only.+\r?\n/gm, '');
            } else {
                htmlFile = rawHtmlFile.replaceAll(/.+data-dev-only.+\r?\n/gm, '');
            }
        } catch (error) {
            if ((error as any).code == 'ENOENT') {
                return `<h1>⚠ index.html not found:</h1><pre>You probably deleted the 'citizen/system_resources/monitor/panel/index.html' file, or the folders above it.</pre>`;
            } else {
                return `<h1>⚠ index.html load error:</h1><pre>${(error as Error).message}</pre>`
            }
        }
    }

    //Checking if already logged in
    const authResult = checkRequestAuth(
        ctx.request.headers,
        ctx.ip,
        ctx.txVars.isLocalRequest,
        ctx.sessTools
    );
    let authedAdmin: AuthedAdminType | false = false;
    if (authResult.success) {
        authedAdmin = authResult.admin;
    }

    //Preparing vars
    const basePath = (ctx.txVars.isWebInterface) ? '/' : consts.nuiWebpipePath;
    const injectedConsts: InjectedTxConsts = {
        //env
        fxsVersion: txEnv.fxsVersionTag,
        fxsOutdated: txCore.updateChecker.fxsUpdateData,
        txaVersion: txEnv.txaVersion,
        txaOutdated: txCore.updateChecker.txaUpdateData,
        serverTimezone,
        isWindows: txEnv.isWindows,
        isWebInterface: ctx.txVars.isWebInterface,
        showAdvanced: (txDevEnv.ENABLED || console.isVerbose),
        hasMasterAccount: txCore.adminStore.hasAdmins(true),
        passwordLoginAllowed: isDirectLocalRequest(ctx),
        defaultTheme: tmpDefaultTheme,
        customThemes: tmpCustomThemes.map(({ name, isDark }) => ({ name, isDark })),
        providerLogo: txHostConfig.providerLogo,
        providerName: txHostConfig.providerName,
        hostConfigSource: txHostConfig.sourceName,

        //Login page info
        server: {
            name: txCore.cacheStore.getTyped('fxsRuntime:projectName', isString) ?? txConfig.general.serverName,
            game: txCore.cacheStore.getTyped('fxsRuntime:gameName', isString),
            icon: txCore.cacheStore.getTyped('fxsRuntime:iconFilename', isString),
        },

        //auth
        preAuth: authedAdmin && authedAdmin.getAuthData(),
    };

    //Prepare placeholders
    const replacers: { [key: string]: string } = {};
    replacers.basePath = `<base href="${escapeHtmlAttribute(basePath)}">`;
    replacers.ogTitle = escapeHtmlAttribute(`txAdmin - ${txConfig.general.serverName}`);
    replacers.ogDescripttion = escapeHtmlAttribute(`Manage & Monitor your FiveM/RedM Server with txAdmin v${txEnv.txaVersion} atop FXServer ${txEnv.fxsVersion}`);
    replacers.txConstsInjection = `<script>window.txConsts = ${escapeHtmlRawText(JSON.stringify(injectedConsts))};</script>`;
    replacers.devModules = txDevEnv.ENABLED ? devModulesScript : '';

    //Prepare custom themes style tag
    replacers.customThemesStyle = '';
    if (tmpCustomThemes.length) {
        const cssThemes = [];
        for (const theme of tmpCustomThemes) {
            const cssVars = [];
            const safeThemeName = sanitizeClassToken(theme.name);
            if (!safeThemeName) continue;
            for (const [name, value] of Object.entries(theme.style)) {
                const safeName = sanitizeCssVarName(name);
                const safeValue = sanitizeCssVarValue(value);
                if (!safeName || !safeValue) continue;
                cssVars.push(`--${safeName}: ${safeValue};`);
            }
            cssThemes.push(`.theme-${safeThemeName} { ${cssVars.join(' ')} }`);
        }
        replacers.customThemesStyle = `<style>${escapeHtmlRawText(cssThemes.join('\n'))}</style>`;
    }

    //AusNetworks: brand styling that colour tokens alone cannot express -
    //typography, radius, gradients and surface treatment. Appended after the
    //theme variables so it can reference them.
    replacers.customThemesStyle += `<style>${escapeHtmlRawText(ausnetworksBrandCss)}</style>`;

    //Setting the theme class from the cookie
    //AusNetworks: a custom theme needs BOTH the light/dark base class and its
    //own theme-<name> class. Upstream assigned tmpDefaultTheme directly, which
    //only produces a valid class list for the built-in 'dark'/'light' names.
    const resolveThemeClasses = (themeName: string) => {
        if (tmpDefaultThemes.includes(themeName)) return themeName;
        const custom = tmpCustomThemes.find((t) => t.name === themeName);
        if (!custom) return 'dark';
        return `${custom.isDark ? 'dark' : 'light'} theme-${custom.name}`;
    };
    let htmlClasses = resolveThemeClasses(tmpDefaultTheme);
    const themeCookie = ctx.cookies.get(consts.cookies.theme);
    if (themeCookie) {
        if (tmpDefaultThemes.includes(themeCookie)) {
            htmlClasses = themeCookie;
        } else {
            const selectedCustomTheme = tmpCustomThemes.find((theme) => theme.name === themeCookie);
            if (!selectedCustomTheme) {
                htmlClasses = resolveThemeClasses(tmpDefaultTheme);
            } else {
                const lightDarkSelector = selectedCustomTheme.isDark ? 'dark' : 'light';
                htmlClasses = `${lightDarkSelector} theme-${selectedCustomTheme.name}`;
            }
        }
    }
    replacers.htmlClasses = escapeHtmlAttribute(htmlClasses);

    //Replace
    let htmlOut = htmlFile;
    for (const [placeholder, value] of Object.entries(replacers)) {
        const replacerRegex = new RegExp(`(<!--\\s*)?{{${placeholder}}}(\\s*-->)?`, 'g');
        htmlOut = htmlOut.replaceAll(replacerRegex, value);
    }

    //If in prod mode and NUI, replace the entry point with the local one
    //This is required because of how badly the WebPipe handles "large" files
    if (!txDevEnv.ENABLED) {
        const base = ctx.txVars.isWebInterface ? `./` : `nui://monitor/panel/`;
        htmlOut = htmlOut.replaceAll(/(src|href)="\.\/(\w+)-(\w+(?:\.v\d+)?)\.(js|css)"/g, `$1="${base}$2-$3.$4"`);
    }

    return htmlOut;
}
