import type { APIRoute } from 'astro';
import { insertClient, saveSubHistory } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const db = (locals as any).runtime.env.DB;
  const form = await request.formData();

  const emails = form.getAll('contact_email').map(e => String(e).trim()).filter(Boolean);
  const data = {
    company_id:           String(form.get('company_id') || '').trim(),
    company_name:         String(form.get('company_name') || '').trim(),
    type:                 String(form.get('type') || 'Subscription').trim(),
    status:               String(form.get('status') || 'Active').trim(),
    employee_base:        String(form.get('employee_base') || '').trim(),
    contact_name:         String(form.get('contact_name') || '').trim(),
    contact_email:        emails.join(', '),
    agreement_start_date: String(form.get('agreement_start_date') || '').trim() || null,
    agreement_end_date:   String(form.get('agreement_end_date') || '').trim() || null,
    campaign_start_date:  String(form.get('campaign_start_date') || '').trim() || null,
    campaign_end_date:    String(form.get('campaign_end_date') || '').trim() || null,
    location:             String(form.get('location') || '').trim(),
    located_in:           String(form.get('located_in') || '').trim(),
    dealspoint_account:   String(form.get('dealspoint_account') || '').trim(),
    notes:                String(form.get('notes') || '').trim(),
    active_month:         String(form.get('active_month') || '').trim(),
    engagement_score:     String(form.get('engagement_score') || '').trim(),
    region:               String(form.get('region') || 'India & RoW').trim(),
    cx_poc:               String(form.get('cx_poc') || '').trim(),
    contract_value:       0,
    currency:             'USD',
    contract_fy_override: null,
  };

  const fyArr          = form.getAll('sub_fy');
  const amountArr      = form.getAll('sub_amount');
  const currencyArr    = form.getAll('sub_currency');
  const contributorArr = form.getAll('sub_contributor');

  const subEntries: Array<{ fy: number; amount: number; currency: string; contributor: string }> = [];
  for (let i = 0; i < fyArr.length; i++) {
    const fy          = parseInt(String(fyArr[i] || ''));
    const amount      = parseFloat(String(amountArr[i] || '0'));
    const currency    = String(currencyArr[i] || 'USD').trim();
    const contributor = String(contributorArr[i] || 'Sales').trim();
    if (fy && amount > 0) subEntries.push({ fy, amount, currency, contributor });
  }

  const newId = await insertClient(db, data);
  if (subEntries.length > 0) await saveSubHistory(db, newId, subEntries);

  return new Response(JSON.stringify({ id: newId, ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};