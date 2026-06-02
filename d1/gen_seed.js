// Generates seed.sql from data/*.json
import { readFileSync, writeFileSync } from 'fs';

const esc = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g,"''")}'`;

const clients    = JSON.parse(readFileSync('data/clients.json',    'utf8'));
const activities = JSON.parse(readFileSync('data/activities.json', 'utf8'));
const subHistory = JSON.parse(readFileSync('data/sub_history.json','utf8'));

const cols = ['id','company_id','company_name','type','status','employee_base','contact_name',
  'contact_email','agreement_start_date','agreement_end_date','campaign_start_date',
  'campaign_end_date','location','located_in','dealspoint_account','notes',
  'active_month','engagement_score','region','cx_poc','contract_value','currency',
  'contract_fy_override','manual_contract_value','manual_contract_currency'];

const lines = ['-- Auto-generated seed from data/*.json\n'];

for (const c of clients) {
  const vals = cols.map(k => esc(c[k] ?? null)).join(',');
  lines.push(`INSERT INTO clients (${cols.join(',')}) VALUES (${vals});`);
}
lines.push('');
for (const a of activities) {
  lines.push(`INSERT INTO activities (id,client_id,activity_type,note,created_at) VALUES (${esc(a.id)},${esc(a.client_id)},${esc(a.activity_type)},${esc(a.note)},${esc(a.created_at)});`);
}
lines.push('');
for (const s of subHistory) {
  lines.push(`INSERT INTO sub_history (id,client_id,financial_year,amount,currency,contributor,created_at) VALUES (${esc(s.id)},${esc(s.client_id)},${esc(s.financial_year)},${esc(s.amount)},${esc(s.currency)},${esc(s.contributor)},${esc(s.created_at)});`);
}

writeFileSync('d1/seed.sql', lines.join('\n'));
console.log(`Written ${lines.length} lines to d1/seed.sql`);
