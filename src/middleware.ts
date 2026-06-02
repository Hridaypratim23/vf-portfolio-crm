import { defineMiddleware } from 'astro:middleware';
import { ensureSeeded } from './lib/seed';

const COOKIE_NAME = 'auth_session';

// Module-level session cache — persists across requests within the same Worker isolate.
// Tokens are cached for 5 minutes to avoid a D1 round-trip on every page load.
const sessionCache = new Map<string, number>(); // token → expiry timestamp (ms)

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  // CDN resources the app already loads; inline scripts/styles are unavoidable without nonces.
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' cdn.jsdelivr.net 'unsafe-inline'",
    "style-src 'self' cdn.jsdelivr.net fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' fonts.gstatic.com cdn.jsdelivr.net",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

function applySecurityHeaders(response: Response): Response {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, locals, redirect } = context;
  const path = url.pathname;

  // CSRF protection: reject mutating requests whose Origin doesn't match this host.
  // Requests without an Origin header (curl, server-to-server) are allowed through.
  const method = context.request.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = context.request.headers.get('Origin');
    if (origin && origin !== url.origin) {
      return new Response(JSON.stringify({ error: 'CSRF check failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (path === '/login' || path.startsWith('/api/logout')) {
    return applySecurityHeaders(await next());
  }

  const env = (locals as any).runtime?.env;
  const db  = env?.DB;
  const secret: string | undefined = env?.AUTH_SECRET;

  if (!secret || !db) {
    return applySecurityHeaders(await next());
  }

  // Seed DB on first cold start if empty — never crash the app if seeding fails
  try { await ensureSeeded(db); } catch { /* seeding failure is non-fatal */ }

  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return redirect('/login');
  }

  // Fast path — token already validated this isolate instance
  const cached = sessionCache.get(token);
  if (cached && cached > Date.now()) {
    const response = await next();
    if (response.status === 200 && !response.headers.has('Cache-Control')) {
      response.headers.set('Cache-Control', 'private, no-cache');
    }
    return applySecurityHeaders(response);
  }

  const session = await db
    .prepare("SELECT token FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .bind(token)
    .first();

  if (!session) {
    sessionCache.delete(token);
    cookies.delete(COOKIE_NAME, { path: '/' });
    return redirect('/login');
  }

  sessionCache.set(token, Date.now() + 5 * 60 * 1000);

  const response = await next();
  // Allow bfcache (back/forward cache) — no-cache permits it, no-store blocks it.
  // Only set if the Worker hasn't already set one (avoids overriding API routes).
  if (response.status === 200 && !response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'private, no-cache');
  }
  return applySecurityHeaders(response);
});