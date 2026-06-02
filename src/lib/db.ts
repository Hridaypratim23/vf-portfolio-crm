// D1-backed data layer. All functions accept a D1Database binding as first arg.
// Pages: const db = (Astro.locals as any).runtime.env.DB
// Functions: env.DB

type DB = any;
type AnyRow = Record<string, any>;

export const UPLOADS_DIR = 'public/agreements';

export function nowStr() {
  return new Date().toLocaleString('sv-SE').replace('T', ' ');
}

// ── Clients ──────────────────────────────────────────────────────────────────

export async function getAllClients(db: DB): Promise<AnyRow[]> {
  const { results } = await db.prepare('SELECT * FROM clients ORDER BY company_name').all();
  return results;
}

export async function getClientById(db: DB, id: number): Promise<AnyRow | null> {
  return await db.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
}

export async function insertClient(db: DB, data: Record<string, any>): Promise<number> {
  const result = await db.prepare(`
    INSERT INTO clients
      (company_id,company_name,type,status,employee_base,contact_name,contact_email,
       agreement_start_date,agreement_end_date,campaign_start_date,campaign_end_date,
       location,located_in,dealspoint_account,notes,active_month,engagement_score,
       region,cx_poc,contract_value,currency,contract_fy_override,
       manual_contract_value,manual_contract_currency)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    data.company_id||'', data.company_name||'', data.type||'Subscription', data.status||'Active',
    data.employee_base||'', data.contact_name||'', data.contact_email||'',
    data.agreement_start_date||null, data.agreement_end_date||null,
    data.campaign_start_date||null, data.campaign_end_date||null,
    data.location||'', data.located_in||'', data.dealspoint_account||'',
    data.notes||'', data.active_month||'', data.engagement_score||'',
    data.region||'', data.cx_poc||'',
    data.contract_value||0, data.currency||'USD', data.contract_fy_override||null,
    data.manual_contract_value||0, data.manual_contract_currency||'USD',
  ).run();
  return result.meta.last_row_id as number;
}

export async function updateClient(db: DB, id: number, data: Record<string, any>): Promise<void> {
  await db.prepare(`
    UPDATE clients SET
      company_id=?,company_name=?,type=?,status=?,employee_base=?,
      contact_name=?,contact_email=?,agreement_start_date=?,agreement_end_date=?,
      campaign_start_date=?,campaign_end_date=?,location=?,located_in=?,
      dealspoint_account=?,notes=?,active_month=?,engagement_score=?,
      region=?,cx_poc=?,manual_contract_value=?,manual_contract_currency=?
    WHERE id=?
  `).bind(
    data.company_id||'', data.company_name||'', data.type||'Subscription', data.status||'Active',
    data.employee_base||'', data.contact_name||'', data.contact_email||'',
    data.agreement_start_date||null, data.agreement_end_date||null,
    data.campaign_start_date||null, data.campaign_end_date||null,
    data.location||'', data.located_in||'', data.dealspoint_account||'',
    data.notes||'', data.active_month||'', data.engagement_score||'',
    data.region||'', data.cx_poc||'',
    data.manual_contract_value||0, data.manual_contract_currency||'USD',
    id,
  ).run();
}

export async function deleteClient(db: DB, id: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM clients       WHERE id = ?').bind(id),
    db.prepare('DELETE FROM activities    WHERE client_id = ?').bind(id),
    db.prepare('DELETE FROM agreements    WHERE client_id = ?').bind(id),
    db.prepare('DELETE FROM extra_revenue WHERE client_id = ?').bind(id),
    db.prepare('DELETE FROM sub_history   WHERE client_id = ?').bind(id),
  ]);
}

// ── Activities ────────────────────────────────────────────────────────────────

export async function getActivities(db: DB, clientId: number): Promise<AnyRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM activities WHERE client_id = ? ORDER BY created_at DESC')
    .bind(clientId).all();
  return results;
}

export async function insertNote(db: DB, clientId: number, note: string, activityType: string): Promise<void> {
  await db.prepare('INSERT INTO activities (client_id,activity_type,note,created_at) VALUES (?,?,?,?)')
    .bind(clientId, activityType, note, nowStr()).run();
}

// ── Agreements ────────────────────────────────────────────────────────────────

export async function getAgreements(db: DB, clientId: number): Promise<AnyRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM agreements WHERE client_id = ? ORDER BY uploaded_at DESC')
    .bind(clientId).all();
  return results;
}

export async function getAgreementById(db: DB, id: number): Promise<AnyRow | null> {
  return await db.prepare('SELECT * FROM agreements WHERE id = ?').bind(id).first();
}

export async function insertAgreement(db: DB, clientId: number, filename: string, originalName: string, docType: string): Promise<number> {
  const result = await db.prepare('INSERT INTO agreements (client_id,filename,original_name,doc_type,uploaded_at) VALUES (?,?,?,?,?)')
    .bind(clientId, filename, originalName, docType, nowStr()).run();
  return result.meta.last_row_id as number;
}

export async function deleteAgreementRow(db: DB, id: number): Promise<void> {
  await db.prepare('DELETE FROM agreements WHERE id = ?').bind(id).run();
}

// ── Extra Revenue ─────────────────────────────────────────────────────────────

export async function getExtraRevenue(db: DB, clientId: number): Promise<AnyRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM extra_revenue WHERE client_id = ? ORDER BY financial_year DESC')
    .bind(clientId).all();
  return results;
}

export async function getAllExtraRevenue(db: DB): Promise<AnyRow[]> {
  const { results } = await db.prepare('SELECT * FROM extra_revenue').all();
  return results;
}

export async function insertExtraRevenue(db: DB, clientId: number, type: string, amount: number, currency: string, description: string, financialYear: number): Promise<void> {
  await db.prepare('INSERT INTO extra_revenue (client_id,type,amount,currency,description,financial_year,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind(clientId, type, amount, currency, description, financialYear, nowStr()).run();
}

export async function deleteExtraRevenue(db: DB, id: number): Promise<void> {
  await db.prepare('DELETE FROM extra_revenue WHERE id = ?').bind(id).run();
}

export function getExtraRevenueSumForClient(rows: AnyRow[], clientId: number, type: 'lic' | 'rp'): number {
  return rows
    .filter(r => r.client_id === clientId && (type === 'lic' ? r.type === 'Additional Licenses' : r.type !== 'Additional Licenses'))
    .reduce((s, r) => s + (r.amount || 0), 0);
}

export function getExtraRevenueSumForClientFY(rows: AnyRow[], clientId: number, type: 'lic' | 'rp', fy: number): number {
  return rows
    .filter(r => r.client_id === clientId && r.financial_year === fy && (type === 'lic' ? r.type === 'Additional Licenses' : r.type !== 'Additional Licenses'))
    .reduce((s, r) => s + (r.amount || 0), 0);
}

// ── Subscription History ──────────────────────────────────────────────────────

export async function getSubHistory(db: DB, clientId: number): Promise<Array<{ id: number; financial_year: number; amount: number; currency: string; contributor?: string }>> {
  const { results } = await db
    .prepare('SELECT * FROM sub_history WHERE client_id = ? ORDER BY financial_year DESC')
    .bind(clientId).all();
  return results as any;
}

export async function getAllSubHistory(db: DB): Promise<AnyRow[]> {
  const { results } = await db.prepare('SELECT * FROM sub_history').all();
  return results;
}

export async function updateChurnOutcome(db: DB, id: number, outcome: string | null, reason: string | null): Promise<void> {
  await db.prepare('UPDATE clients SET churn_outcome = ?, churn_reason = ? WHERE id = ?')
    .bind(outcome || null, reason || null, id).run();
}

export async function saveSubHistory(db: DB, clientId: number, entries: Array<{ fy: number; amount: number; currency: string; contributor?: string }>): Promise<void> {
  const stmts: any[] = [db.prepare('DELETE FROM sub_history WHERE client_id = ?').bind(clientId)];
  for (const e of entries) {
    if (e.fy && e.amount > 0) {
      stmts.push(
        db.prepare('INSERT INTO sub_history (client_id,financial_year,amount,currency,contributor,created_at) VALUES (?,?,?,?,?,?)')
          .bind(clientId, e.fy, e.amount, e.currency||'USD', e.contributor||'Sales', nowStr())
      );
    }
  }
  await db.batch(stmts);
}