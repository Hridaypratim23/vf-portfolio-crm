// Revenue calculation helpers — ported from app.py

export const FALLBACK_FX_RATES: Record<string, number> = {
  USD: 1, INR: 84.5, EUR: 0.93, GBP: 0.79, AED: 3.67, SGD: 1.35, CAD: 1.37, AUD: 1.55,
};

// Module-level FX cache — persists across requests within the same Worker isolate.
// Eliminates the external HTTP call on every page load after the first fetch.
let _fxCache: Record<string, number> | null = null;
let _fxCacheAt = 0;
const FX_TTL = 60 * 60 * 1000; // 1 hour

export async function getLiveFxRates(): Promise<Record<string, number>> {
  if (_fxCache && Date.now() - _fxCacheAt < FX_TTL) {
    return _fxCache;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      cf: { cacheTtl: 3600, cacheEverything: true },
    } as RequestInit);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data: any = await res.json();
    if (data.result !== 'success' || !data.rates) throw new Error('bad payload');
    _fxCache = { ...FALLBACK_FX_RATES, ...data.rates };
    _fxCacheAt = Date.now();
    return _fxCache;
  } catch {
    return { ...FALLBACK_FX_RATES };
  }
}

// Contract value for display only:
//   Priority 1: manual_contract_value override (set explicitly in Edit form)
//   Priority 2: sub_history latest FY sum
//   Priority 3: raw client.contract_value fallback
export function contractValueForDisplay(
  client: { contract_value?: number; currency?: string; manual_contract_value?: number; manual_contract_currency?: string },
  subHist: Array<{ financial_year: number; amount: number; currency: string }>,
  toUSD: (amount: number, currency: string) => number = (a) => a
): { usd: number; fy: number | null; isManual?: boolean } | null {
  // Priority 1: manual override
  const manualVal = client.manual_contract_value || 0;
  if (manualVal > 0) {
    const usd = toUSD(manualVal, client.manual_contract_currency || 'USD');
    return { usd: Math.round(usd), fy: null, isManual: true };
  }
  // Priority 2: sub_history latest FY
  if (subHist.length > 0) {
    const maxFy = Math.max(...subHist.map(r => r.financial_year));
    const usd = subHist
      .filter(r => r.financial_year === maxFy)
      .reduce((s, r) => s + toUSD(r.amount || 0, r.currency || 'USD'), 0);
    return { usd: Math.round(usd), fy: maxFy };
  }
  // Priority 3: raw contract_value fallback
  const raw = client.contract_value || 0;
  if (raw > 0) {
    return { usd: Math.round(toUSD(raw, client.currency || 'USD')), fy: null };
  }
  return null;
}

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Try common formats: YYYY-MM-DD, MM/DD/YYYY, DD-Mon-YY, DD-Mon-YYYY
  const clean = s.trim();
  let d: Date | null = null;

  // ISO: 2026-04-01
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    d = new Date(clean + 'T00:00:00');
  }
  // Slash date: MM/DD/YYYY or DD/MM/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const parts = clean.split('/');
    const p0 = parseInt(parts[0]);
    const p1 = parseInt(parts[1]);
    const yr = parts[2];
    // If first segment > 12 it must be DD/MM/YYYY (matching Flask's %d/%m/%Y fallback)
    if (p0 > 12) {
      d = new Date(`${yr}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T00:00:00`);
    } else if (p1 > 12) {
      // Second segment > 12 means MM/DD/YYYY
      d = new Date(`${yr}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}T00:00:00`);
    } else {
      // Ambiguous — Flask tries %d/%m/%Y before %m/%d/%Y, so default to DD/MM/YYYY
      d = new Date(`${yr}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T00:00:00`);
    }
  }
  // DD-Mon-YY or DD-Mon-YYYY: 01-May-26 or 01-May-2026
  else if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(clean)) {
    const months: Record<string,string> = {
      jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
      jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'
    };
    const parts = clean.split('-');
    const day = parts[0].padStart(2,'0');
    const mon = months[parts[1].toLowerCase()] || '01';
    let yr = parseInt(parts[2]);
    if (yr < 100) yr += 2000;
    d = new Date(`${yr}-${mon}-${day}T00:00:00`);
  }
  // Mon-YY or Mon-YYYY (month-only, no day): Aug-24 or Aug-2024
  else if (/^[A-Za-z]{3}-\d{2,4}$/.test(clean)) {
    const months: Record<string,string> = {
      jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
      jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'
    };
    const parts = clean.split('-');
    const mon = months[parts[0].toLowerCase()] || '01';
    let yr = parseInt(parts[1]);
    if (yr < 100) yr += 2000;
    d = new Date(`${yr}-${mon}-01T00:00:00`);
  }

  return d && !isNaN(d.getTime()) ? d : null;
}

export function fyOfDate(dateStr: string | null | undefined): number | null {
  const d = parseDate(dateStr);
  if (!d) return null;
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; // month is 0-indexed, Apr=3
}

export function currentFY(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export function fyLabel(fyStart: number): string {
  return `FY ${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
}

export function isMultiyear(startStr: string | null, endStr: string | null, threshold = 400): boolean {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  if (!start || !end || end <= start) return false;
  return (end.getTime() - start.getTime()) / 86400000 > threshold;
}

export function prorateCvForFy(startStr: string, endStr: string, cv: number, fyStartYear: number): number {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  if (!start || !end || cv <= 0) return 0;

  const fyStart = new Date(`${fyStartYear}-04-01T00:00:00`);
  const fyEnd   = new Date(`${fyStartYear + 1}-03-31T00:00:00`);

  const overlapStart = start > fyStart ? start : fyStart;
  const overlapEnd   = end   < fyEnd   ? end   : fyEnd;
  if (overlapEnd <= overlapStart) return 0;

  const contractDays = (end.getTime() - start.getTime()) / 86400000;
  const overlapDays  = (overlapEnd.getTime() - overlapStart.getTime()) / 86400000;
  return contractDays > 0 ? (overlapDays / contractDays) * cv : 0;
}

export function isSubscription(t: string): boolean {
  return t === 'Subscription' || t === 'Subscription (Partnership)'
      || t === 'Annual'        || t === 'Annual (Partnership)';
}

export function isOnetime(t: string): boolean {
  return t === 'One time' || t === 'One time (Repeat)'
      || t === 'One Time' || t === 'One Time (Repeat)' || t === 'One Time (Partnership)';
}

export interface FyBreakdownEntry {
  label: string;
  fyStart: number;
  sub: number;   // subscription contract + additional licenses (all USD)
  ot: number;    // one-time contract (all USD)
  extraRp: number; // reward points extra revenue (all USD)
  total: number;
  clientCount: number;
  isCurrent: boolean;
}

export function buildFyBreakdown(
  clients: any[],
  extraRevRows: any[],
  subHistRows: any[],
  todayFyStart: number,
  toUSD: (amount: number, currency: string) => number = (a) => a
): FyBreakdownEntry[] {
  // Build lookup maps — store currency alongside amount
  const subHistByClient: Record<number, Array<{ financial_year: number; amount: number; currency: string }>> = {};
  for (const row of subHistRows) {
    if (!subHistByClient[row.client_id]) subHistByClient[row.client_id] = [];
    subHistByClient[row.client_id].push({
      financial_year: row.financial_year,
      amount: row.amount || 0,
      currency: row.currency || 'USD',
    });
  }

  const breakdown: FyBreakdownEntry[] = [];

  for (let fyStart = 2024; fyStart <= todayFyStart; fyStart++) {
    let fySub = 0, fyOt = 0, fyExtraRp = 0;
    const fyClientIds = new Set<number>();

    for (const c of clients) {
      const cv = c.contract_value || 0;
      const cur = c.currency || 'USD';
      const ctype = c.type || '';
      const subHist = subHistByClient[c.id] || [];

      if (subHist.length > 0) {
        for (const entry of subHist) {
          if (entry.financial_year === fyStart) {
            const amtUSD = toUSD(entry.amount, entry.currency);
            if (isSubscription(ctype) || ctype === 'Annual') fySub += amtUSD;
            else fyOt += amtUSD;
            fyClientIds.add(c.id);
          }
        }
      } else if (cv > 0) {
        const fyOverride = c.contract_fy_override || null;
        if (fyOverride) {
          if (fyOverride === fyStart) {
            if (isSubscription(ctype) || ctype === 'Annual') fySub += toUSD(cv, cur);
            else fyOt += toUSD(cv, cur);
            fyClientIds.add(c.id);
          }
        } else if (isSubscription(ctype) || ctype === 'Annual') {
          if (isMultiyear(c.agreement_start_date, c.agreement_end_date)) {
            const share = prorateCvForFy(c.agreement_start_date, c.agreement_end_date, cv, fyStart);
            if (share > 0) { fySub += toUSD(share, cur); fyClientIds.add(c.id); }
          } else {
            const startFy = fyOfDate(c.agreement_start_date);
            if (startFy === fyStart) { fySub += toUSD(cv, cur); fyClientIds.add(c.id); }
          }
        } else if (isOnetime(ctype)) {
          const startFy = fyOfDate(c.agreement_start_date) ?? fyOfDate(c.campaign_start_date);
          if (startFy === fyStart) { fyOt += toUSD(cv, cur); fyClientIds.add(c.id); }
        }
      }
    }

    for (const row of extraRevRows) {
      try {
        let rowFy: number;
        if (row.financial_year) {
          rowFy = row.financial_year;
        } else {
          const d = new Date(row.created_at.slice(0, 10));
          rowFy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        }
        if (rowFy === fyStart) {
          const amtUSD = toUSD(row.amount || 0, row.currency || 'USD');
          // Additional Licenses fold into subscription; Reward Points shown separately
          if (row.type === 'Additional Licenses') { fySub += amtUSD; fyClientIds.add(row.client_id); }
          else fyExtraRp += amtUSD;
        }
      } catch {}
    }

    const fyTotal = fySub + fyOt + fyExtraRp;
    if (fyTotal > 0 || fyStart >= todayFyStart) {
      breakdown.push({
        label: fyLabel(fyStart),
        fyStart,
        sub: Math.round(fySub),
        ot: Math.round(fyOt),
        extraRp: Math.round(fyExtraRp),
        total: Math.round(fyTotal),
        clientCount: fyClientIds.size,
        isCurrent: fyStart === todayFyStart,
      });
    }
  }

  return breakdown;
}

export function getClientRevenueSummary(
  client: any,
  subHist: Array<{ financial_year: number; amount: number; currency: string }>,
  extraLicAll: number,
  extraRpAll: number,
  extraLicCur: number,
  extraRpCur: number,
  fy: number
) {
  let totalSub = 0, currentSub = 0;
  const ctype = client.type || '';

  // Derive display currency from sub_history entries (actual entered currency),
  // falling back to client.currency only when no history exists.
  let displayCurrency: string = client.currency || 'USD';
  if (subHist.length > 0) {
    const curFyRow = subHist.find(r => r.financial_year === fy && r.currency);
    const latestRow = [...subHist].sort((a, b) => b.financial_year - a.financial_year).find(r => r.currency);
    displayCurrency = (curFyRow?.currency || latestRow?.currency || client.currency || 'USD').toUpperCase();

    totalSub   = subHist.reduce((s, r) => s + (r.amount || 0), 0);
    currentSub = subHist.filter(r => r.financial_year === fy).reduce((s, r) => s + (r.amount || 0), 0);
  } else {
    totalSub = client.contract_value || 0;
    const fyOverride = client.contract_fy_override || null;
    if (totalSub > 0) {
      if (fyOverride) {
        if (fyOverride === fy) currentSub = totalSub;
      } else if (isSubscription(ctype) || ctype === 'Annual') {
        if (isMultiyear(client.agreement_start_date, client.agreement_end_date)) {
          currentSub = prorateCvForFy(client.agreement_start_date, client.agreement_end_date, totalSub, fy);
        } else {
          if (fyOfDate(client.agreement_start_date) === fy) currentSub = totalSub;
        }
      } else if (isOnetime(ctype)) {
        const startFy = fyOfDate(client.agreement_start_date) ?? fyOfDate(client.campaign_start_date);
        if (startFy === fy) currentSub = totalSub;
      }
    }
  }

  const totalSubFinal   = Math.round(totalSub + extraLicAll);
  const totalRpFinal    = Math.round(extraRpAll);
  const currentSubFinal = Math.round(currentSub + extraLicCur);
  const currentRpFinal  = Math.round(extraRpCur);

  return {
    totalSub:    totalSubFinal,
    totalRp:     totalRpFinal,
    totalAll:    totalSubFinal + totalRpFinal,
    currentSub:  currentSubFinal,
    currentRp:   currentRpFinal,
    currentAll:  currentSubFinal + currentRpFinal,
    currency:    displayCurrency,
    fyLabel:     fyLabel(fy),
    hasAny:      totalSubFinal + totalRpFinal > 0,
  };
}