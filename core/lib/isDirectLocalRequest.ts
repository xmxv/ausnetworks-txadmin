import type { InitializedCtx } from '@modules/WebServer/ctxTypes';

/*
 * AusNetworks addition.
 *
 * Answers: did this request originate on this host, or arrive through the
 * Cloudflare Tunnel?
 *
 * Deliberately does NOT use ctx.ip or txVars.isLocalRequest. With
 * app.proxy = true (needed so rate limiting and the audit log see real
 * client IPs), ctx.ip is read from X-Forwarded-For, and Koa takes the
 * LEFTMOST entry. cloudflared appends the true client IP rather than
 * replacing the header, so a visitor sending "X-Forwarded-For: 127.0.0.1"
 * produces "127.0.0.1, <their real ip>" and ctx.ip resolves to 127.0.0.1.
 * Trusting that would let anyone on the internet appear local.
 *
 * Two independent conditions must hold:
 *  1. No proxy/CDN headers. cloudflared always sets these for tunnelled
 *     traffic, and Cloudflare overwrites CF-Connecting-IP at its edge, so a
 *     client cannot strip them.
 *  2. The real TCP peer is loopback. socket.remoteAddress is the kernel's
 *     view of the connection and is not client-controllable.
 *
 * Anything reaching us over the tunnel fails (1). Anything from off-box
 * fails (2) - and cannot reach the port anyway, since 40120/40121 are
 * blocked inbound at the firewall.
 */
const PROXY_HEADERS = [
    'cf-connecting-ip',
    'cf-ray',
    'cf-ipcountry',
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-forwarded-host',
    'x-real-ip',
] as const;

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export const isDirectLocalRequest = (ctx: InitializedCtx): boolean => {
    const headers = (ctx.headers ?? {}) as Record<string, unknown>;
    for (const h of PROXY_HEADERS) {
        if (headers[h] !== undefined) return false;
    }
    const peer = (ctx.req as any)?.socket?.remoteAddress;
    return typeof peer === 'string' && LOOPBACK.has(peer);
};
