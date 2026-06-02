import type { APIRoute } from 'astro';
import { insertNote } from '../../../../lib/db';

export const prerender = false;

const ok  = () => new Response(JSON.stringify({ ok: true }),    { status: 200, headers: { 'Content-Type': 'application/json' } });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s,   headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const db = (locals as any).runtime.env.DB;
  const id = parseInt(params.id!);
  if (!id) return err('Invalid client ID');

  try {
    const form          = await request.formData();
    const note          = String(form.get('note')          || '').trim();
    const activity_type = String(form.get('activity_type') || 'Note').trim();
    if (note) await insertNote(db, id, note, activity_type);
    return ok();
  } catch (e: any) {
    return err(String(e), 500);
  }
};