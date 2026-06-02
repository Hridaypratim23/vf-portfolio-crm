import type { APIRoute } from 'astro';
import { deleteExtraRevenue } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
  const db = (locals as any).runtime.env.DB;
  const id = parseInt(params.id!);
  try {
    if (id) await deleteExtraRevenue(db, id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};