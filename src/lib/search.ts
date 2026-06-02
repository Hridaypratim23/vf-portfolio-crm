// Smart search helpers — extracted from index.astro

import { parseDate, isSubscription, isOnetime } from './revenue';

function parseActiveMonths(s: string): number[] {
  if (!s) return [];
  const parts = s.replace(/\//g, ',').split(',').map(p => p.trim()).filter(Boolean);
  const MM: Record<string, number> = {
    january:1,jan:1,february:2,feb:2,march:3,mar:3,april:4,apr:4,may:5,
    june:6,jun:6,july:7,jul:7,august:8,aug:8,september:9,sep:9,sept:9,
    october:10,oct:10,november:11,nov:11,december:12,dec:12
  };
  return parts.map(p => MM[p.toLowerCase()]).filter(Boolean);
}

function nextActiveMonthDate(s: string, today: Date): Date | null {
  const months = parseActiveMonths(s);
  if (!months.length) return null;
  let soonest: Date | null = null;
  for (const mo of months) {
    let candidate = new Date(today.getFullYear(), mo - 1, 1);
    const diffDays = (today.getTime() - candidate.getTime()) / 86400000;
    if (diffDays > 20) candidate = new Date(today.getFullYear() + 1, mo - 1, 1);
    if (!soonest || candidate < soonest) soonest = candidate;
  }
  return soonest;
}

function nextRerunDate(start: Date, today: Date): Date {
  let candidate = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  const diffDays = (today.getTime() - candidate.getTime()) / 86400000;
  if (diffDays > 20) candidate = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
  return candidate;
}

function rangCoversMonth(startStr: string | null, endStr: string | null, monthNum: number): boolean {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  if (!start || !end || end < start) return false;
  for (let yr = start.getFullYear(); yr <= end.getFullYear(); yr++) {
    const mFirst = new Date(yr, monthNum - 1, 1);
    const mLast = new Date(yr, monthNum, 0);
    if (start <= mLast && end >= mFirst) return true;
  }
  return false;
}

const MONTHS_MAP: Record<string, number> = {
  january:1,jan:1,february:2,feb:2,march:3,mar:3,april:4,apr:4,may:5,
  june:6,jun:6,july:7,jul:7,august:8,aug:8,september:9,sep:9,sept:9,
  october:10,oct:10,november:11,nov:11,december:12,dec:12
};
const STOPWORDS = new Set(['the','all','show','me','who','are','were','had','have','that','with','for','and','clients','client','in','of','a']);

export function smartSearch(q: string, clients: any[]): [any[], string] {
  const ql = q.trim().toLowerCase();
  const detected: Record<string, any> = {};

  for (const [mn, mv] of Object.entries(MONTHS_MAP)) {
    if (new RegExp('\\b' + mn + '\\b').test(ql)) { detected.month = [mv, mn.charAt(0).toUpperCase() + mn.slice(1)]; break; }
  }
  if (/\binactive\b/.test(ql)) detected.status = 'inactive';
  else if (/\bchurn(ed)?\b/.test(ql)) detected.status = 'churn';
  else if (/\brepeat\b/.test(ql)) detected.status = 'repeat';
  else if (/\bactive\b/.test(ql)) detected.status = 'active';

  if (/\bsubscription\b/.test(ql)) detected.type = 'subscription';
  else if (/\bannual\b/.test(ql)) detected.type = 'annual';
  else if (/\bone.?time\b/.test(ql)) detected.type = 'onetime';

  if (/\b(india|indian|row)\b/.test(ql)) detected.location = 'india';

  const empMatch = ql.match(/(\d+)\s*\+?\s*(employees?|emp|people|users?)/);
  if (empMatch) detected.min_emp = parseInt(empMatch[1]);

  if (/\b(overdue|expired|lapsed)\b/.test(ql)) detected.overdue = true;
  else if (/\b(renewal|renewing|due)\b/.test(ql)) detected.renewal = true;

  const today = new Date();

  if (!Object.keys(detected).length) {
    const words = ql.split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
    if (!words.length) return [clients, `All ${clients.length} clients`];
    const pat = new RegExp(words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'), 'i');
    const results = clients.filter(c => pat.test([c.company_name,c.contact_name,c.contact_email,c.location,c.type,c.status,c.notes].filter(Boolean).join(' ')));
    return [results, `${results.length} result${results.length !== 1 ? 's' : ''} for "${q.trim()}"`];
  }

  let results = [...clients];
  const descParts: string[] = [];

  if (detected.month) {
    const [mv, mn] = detected.month;
    results = results.filter(c => {
      if (c.active_month && parseActiveMonths(c.active_month).includes(mv)) return true;
      const ctype = c.type || '';
      if (isOnetime(ctype)) return rangCoversMonth(c.campaign_start_date, c.campaign_end_date, mv);
      return rangCoversMonth(c.agreement_start_date, c.agreement_end_date, mv);
    });
    descParts.push(`in ${mn}`);
  }
  if (detected.status) {
    const s = detected.status;
    if (s === 'active') { results = results.filter(c => /\bactive\b/i.test(c.status || '')); descParts.push('Active status'); }
    else if (s === 'inactive') { results = results.filter(c => (c.status||'').toLowerCase().includes('inactive')); descParts.push('Inactive status'); }
    else if (s === 'churn') { results = results.filter(c => (c.status||'').toLowerCase().includes('churn')); descParts.push('Churn status'); }
    else if (s === 'repeat') { results = results.filter(c => (c.status||'').toLowerCase().includes('repeat')); descParts.push('Repeat clients'); }
  }
  if (detected.type) {
    const t = detected.type;
    if (t === 'subscription') { results = results.filter(c => isSubscription(c.type||'')); descParts.push('Subscription'); }
    else if (t === 'annual') { results = results.filter(c => (c.type||'') === 'Annual'); descParts.push('Annual'); }
    else if (t === 'onetime') { results = results.filter(c => isOnetime(c.type||'')); descParts.push('One-time'); }
  }
  if (detected.location) {
    results = results.filter(c => (c.type||'') !== 'Annual');
    descParts.push('India & RoW');
  }
  if (detected.min_emp) {
    const minE = detected.min_emp;
    results = results.filter(c => {
      try { return parseInt((c.employee_base||'0').split('/')[0].split('-')[0].replace(/[^0-9]/g,'')) >= minE; } catch { return false; }
    });
    descParts.push(`${minE}+ employees`);
  }
  if (detected.overdue) {
    results = results.filter(c => {
      const end = parseDate(c.agreement_end_date);
      return isSubscription(c.type||'') && end && (end.getTime() - today.getTime()) / 86400000 < -1;
    });
    descParts.push('Overdue renewals');
  } else if (detected.renewal) {
    results = results.filter(c => {
      const end = parseDate(c.agreement_end_date);
      if (!end || !isSubscription(c.type||'')) return false;
      const d = (end.getTime() - today.getTime()) / 86400000;
      return d >= 0 && d <= 90;
    });
    descParts.push('Renewals in 90 days');
  }

  const n = results.length;
  let description = `${n} client${n !== 1 ? 's' : ''}`;
  if (descParts.length) description += '  ·  ' + descParts.join('  ·  ');
  return [results, description];
}