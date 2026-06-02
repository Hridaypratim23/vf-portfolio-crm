import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies, locals, redirect }) => {
  const token = cookies.get('auth_session')?.value;

  if (token) {
    const db = (locals as any).runtime?.env?.DB;
    if (db) {
      try {
        await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      } catch {}
    }
  }

  cookies.delete('auth_session', { path: '/' });
  return redirect('/login');
};