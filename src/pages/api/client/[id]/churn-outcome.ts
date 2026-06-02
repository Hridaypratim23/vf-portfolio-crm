import type { APIRoute } from 'astro';
import { updateChurnOutcome } from '../../../../lib/db';

export const prerender = false;

const ok  = () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const db = (locals as any).runtime.env.DB;
  const id = parseInt(params.id!);
  if (!id) return err('Invalid client ID');
  try {
    const body = await request.json();
    const outcome = body.outcome || null;
    const reason  = (body.reason || '').trim() || null;
    await updateChurnOutcome(db, id, outcome, reason);
    return ok();
  } catch (e: any) {
    return err(String(e), 500);
  }
};