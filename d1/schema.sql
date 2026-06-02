CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  type TEXT DEFAULT 'Subscription',
  status TEXT DEFAULT 'Active',
  employee_base TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  agreement_start_date TEXT,
  agreement_end_date TEXT,
  campaign_start_date TEXT,
  campaign_end_date TEXT,
  location TEXT DEFAULT '',
  located_in TEXT DEFAULT '',
  dealspoint_account TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  active_month TEXT DEFAULT '',
  engagement_score TEXT DEFAULT '',
  region TEXT DEFAULT 'India & RoW',
  cx_poc TEXT DEFAULT '',
  contract_value REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  contract_fy_override TEXT,
  manual_contract_value REAL DEFAULT 0,
  manual_contract_currency TEXT DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  activity_type TEXT DEFAULT 'Note',
  note TEXT DEFAULT '',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS agreements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  filename TEXT DEFAULT '',
  original_name TEXT DEFAULT '',
  doc_type TEXT DEFAULT 'Agreement',
  uploaded_at TEXT
);

CREATE TABLE IF NOT EXISTS extra_revenue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  type TEXT DEFAULT 'Additional Licenses',
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  description TEXT DEFAULT '',
  financial_year INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS sub_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  financial_year INTEGER,
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  contributor TEXT DEFAULT 'Sales',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  ip         TEXT DEFAULT '',
  country    TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp  TEXT NOT NULL,
  ip         TEXT DEFAULT '',
  country    TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  outcome    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);