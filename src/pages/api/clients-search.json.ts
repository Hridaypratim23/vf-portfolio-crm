import type { APIRoute } from 'astro';
import { getAllClients, getAllSubHistory, getAllExtraRevenue } from '../../lib/db';

export const prerender = false;

function fyOfDate(d: string | null): number | null {
  if (!d) return null;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    const m = dt.getMonth(); // 0-based
    const y = dt.getFullYear();
    return m >= 3 ? y : y - 1;
  } catch { return null; }
}

export const GET: APIRoute = async ({ locals }) => {
  const db = (locals as any).runtime.env.DB;

  const [rawClients, rawSh, rawEr] = await Promise.all([
    getAllClients(db),
    getAllSubHistory(db),
    getAllExtraRevenue(db),
  ]) as [any[], any[], any[]];

  // Per-client set of FY start years
  const fyYears: Record<number, Set<number>> = {};
  for (const row of rawSh) {
    if (!fyYears[row.client_id]) fyYears[row.client_id] = new Set();
    fyYears[row.client_id].add(row.financial_year);
  }
  for (const row of rawEr) {
    if (!fyYears[row.client_id]) fyYears[row.client_id] = new Set();
    fyYears[row.client_id].add(row.financial_year);
  }
  for (const c of rawClients) {
    if (!fyYears[c.id]) {
      const fy = fyOfDate(c.agreement_start_date) ?? fyOfDate(c.campaign_start_date);
      if (fy) fyYears[c.id] = new Set([fy]);
    }
  }

  const data = rawClients.map((c: any) => ({
    id:        c.id,
    name:      c.company_name  || '',
    cid:       c.company_id    || '',
    status:    c.status        || '',
    type:      c.type          || '',
    region:    c.region        || '',
    currency:  (c.currency     || 'USD').toUpperCase(),
    employees: String(c.employee_base || ''),
    email:     c.contact_email || '',
    fy:        Array.from(fyYears[c.id] || []).sort(),
  }));

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300',
    },
  });
};