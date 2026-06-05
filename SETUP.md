# Setting Up Your Own CRM — Step by Step

This repo is a template. Follow these steps to get your own live CRM running in about 30 minutes.

---

## What you'll need

- A [GitHub](https://github.com) account
- A [Cloudflare](https://cloudflare.com) account (free)
- [Node.js](https://nodejs.org) installed (v18+)
- Basic comfort with a terminal

---

## Step 1 — Get the code

On the repo page click **"Use this template"** → **"Create a new repository"**.

Give it your own name (e.g. `my-crm`). Set it to **Private** if you don't want it public.

Then clone it to your machine:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
npm install
```

---

## Step 2 — Create your Cloudflare D1 database

Log in to [dash.cloudflare.com](https://dash.cloudflare.com), go to **Storage & Databases → D1 SQLite Database → Create Database**.

Name it anything (e.g. `my-crm-db`). Copy the **Database ID** it shows you.

Open `wrangler.toml` and replace the placeholder:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-crm-db"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```

---

## Step 3 — Create your own data

Your client data lives in `data/clients.json`. Open it — you'll see the structure:

```json
{
  "id": 1,
  "company_name": "TechNova Solutions",
  "type": "Subscription",
  "status": "Active",
  "employee_base": "1200",
  "contact_name": "Priya Gupta",
  "contact_email": "priya.gupta@technovasolutions.com",
  "agreement_start_date": "05/04/2022",
  "agreement_end_date": "24/11/2025",
  "location": "India",
  "region": "India & RoW",
  "contract_value": 610000,
  "currency": "INR",
  "cx_poc": "Your Name"
}
```

Replace the fictional companies with your real clients (or keep fictional ones for demo).

**Valid values:**
- `type`: `Subscription`, `One time`, `One time (Repeat)`, `Annual`
- `status`: `Active`, `Active (Repeat client)`, `Inactive`, `Inactive (Repeat)`, `Churn`
- `region`: `India & RoW`, `Outside India`
- `currency`: `USD`, `INR`, `GBP`, `EUR`, `AED`, `SGD`, `CAD`, `AUD`

After editing `data/clients.json`, regenerate the seed SQL:

```bash
node d1/gen_seed.js
```

---

## Step 4 — Customise the design (optional)

**Colours** — open `tailwind.config.mjs` and change the brand colours:

```js
colors: {
  midnight: '#1a1a3e',   // sidebar background
  'fit-red': '#d92d4a',  // primary action colour
  'fit-green': '#0ba882', // active/success colour
}
```

**Logo** — replace `public/vantagefit-logo.png` with your own logo file (same filename, same dimensions).

**App name** — search for `"Vantage Fit"` across `src/` files and replace with your product name.

**Login page text** — edit `src/pages/login.astro`, find `"A Wellness Platform Employees Love to Use"` and change it.

---

## Step 5 — Deploy to Cloudflare Pages

### 5a. Build the project
```bash
npm run build
```

### 5b. Create a Cloudflare API token
Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → use **"Edit Cloudflare Workers"** template → make sure **Cloudflare Pages: Edit** is included → Create.

### 5c. Deploy
```bash
CLOUDFLARE_API_TOKEN=your_token_here \
CLOUDFLARE_ACCOUNT_ID=your_account_id \
npx wrangler pages deploy dist --project-name your-project-name --branch main --no-bundle
```

Your account ID is in the Cloudflare dashboard URL: `dash.cloudflare.com/ACCOUNT_ID/...`

### 5d. Set secrets in Cloudflare Pages
```bash
echo "your_password" | CLOUDFLARE_API_TOKEN=your_token npx wrangler pages secret put AUTH_PASSWORD --project-name your-project-name

echo "any_random_long_string" | CLOUDFLARE_API_TOKEN=your_token npx wrangler pages secret put AUTH_SECRET --project-name your-project-name
```

### 5e. Bind D1 to your Pages project
Go to Cloudflare dashboard → **Workers & Pages** → your project → **Settings → Bindings → Add D1 Database**:
- Variable name: `DB`
- Select your database from the dropdown

Redeploy once more:
```bash
CLOUDFLARE_API_TOKEN=your_token CLOUDFLARE_ACCOUNT_ID=your_account_id \
npx wrangler pages deploy dist --project-name your-project-name --branch main --no-bundle
```

---

## Step 6 — First login seeds the database

Visit your live URL. Log in with the password you set. On first login the app automatically creates all the database tables and inserts your seed data. No manual SQL needed.

---

## Folder structure (what does what)

```
src/
  pages/          ← every page and API route
  layouts/        ← BaseLayout.astro (sidebar, nav, shared structure)
  components/     ← Badge, Nav, Sidebar
  lib/
    db.ts         ← all database queries
    revenue.ts    ← FX rates and revenue calculations
    search.ts     ← smart search/filter logic
    seed.ts       ← auto-seed on first boot

d1/
  schema.sql      ← database table definitions
  seed.sql        ← generated from data/*.json (run gen_seed.js to update)
  gen_seed.js     ← script to regenerate seed.sql from JSON data

data/
  clients.json    ← YOUR CLIENT DATA — edit this
  activities.json ← activity log entries
  sub_history.json← subscription revenue by FY
  agreements.json ← uploaded agreements metadata

public/
  vantagefit-logo.png ← replace with your logo
  static/style.css    ← global CSS (non-Tailwind styles)
```

---

## Common issues

| Problem | Fix |
|---|---|
| Page shows 500 error | Check that D1 binding is set in Pages settings |
| Login says wrong password | Make sure AUTH_PASSWORD secret is set correctly |
| Logo broken | Put your logo at `public/vantagefit-logo.png` |
| Data not showing | Check `data/clients.json` has valid JSON, re-run `node d1/gen_seed.js`, rebuild |
| Build fails | Run `npm install` first, make sure Node 18+ is installed |

---

## Questions?

This was built by [@Hridaypratim23](https://github.com/Hridaypratim23). Reach out on GitHub.
