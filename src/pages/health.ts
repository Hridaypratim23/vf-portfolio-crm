import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime?.env;
  return new Response(JSON.stringify({
    ok: true,
    hasDB: !!env?.DB,
    hasSecret: !!env?.AUTH_SECRET,
    hasPassword: !!env?.AUTH_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' } });
};
