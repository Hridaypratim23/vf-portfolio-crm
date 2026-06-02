import type { APIRoute } from 'astro';
import { deleteClient } from '../../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
  const db = (locals as any).runtime.env.DB;
  const id = parseInt(params.id!);
  try {
    if (id) await deleteClient(db, id);
    return new Response(JSON.stringify({ ok: true, redirect: '/' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};