import type { APIRoute } from 'astro';
import { insertExtraRevenue } from '../../../../lib/db';

export const prerender = false;

const ok  = () => new Response(JSON.stringify({ ok: true }),    { status: 200, headers: { 'Content-Type': 'application/json' } });
const err = (msg: string, s = 400) => new Response(JSON.stringify({ error: msg }), { status: s,   headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  const db = (locals as any).runtime.env.DB;
  const id = parseInt(params.id!);
  if (!id) return err('Invalid client ID');

  try {
    const form           = await request.formData();
    const type           = String(form.get('type')           || 'Additional Licenses').trim();
    const amount         = parseFloat(String(form.get('amount') || '0'));
    const currency       = String(form.get('currency')       || 'USD').trim();
    const description    = String(form.get('description')    || '').trim();
    const financial_year = parseInt(String(form.get('financial_year') || '0'));
    if (amount > 0) await insertExtraRevenue(db, id, type, amount, currency, description, financial_year);
    return ok();
  } catch (e: any) {
    return err(String(e), 500);
  }
};