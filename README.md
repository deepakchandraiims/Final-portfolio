# Deepak — Institutional Portfolio

Next.js 15 (App Router) · Tailwind + shadcn/ui · Framer Motion · Supabase (content + storage) ·
cookie-session admin auth · Google Drive attach · first-party visitor analytics.

## Quick start
```bash
npm install
cp .env.example .env.local   # fill in your Supabase project (see below)
npm run dev                  # http://localhost:3000  (admin at /admin)
```

## 1. Connect your own Supabase account
1. Create a project at supabase.com.
2. SQL editor → paste and run `supabase/schema.sql` (safe to re-run later — it includes an idempotent migration block for the `files.source` column and the `analytics_events` table).
3. Project Settings → API → copy the **Project URL** and **service_role key**.
4. Set as env vars (locally in `.env.local`, and in Vercel → Project → Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_BUCKET` (defaults to `portfolio-files`, auto-created on first upload)

The service-role key is server-only — it's never sent to the browser. This is also how you point the site at *your* Supabase account instead of a shared one: there's no secret-entry field inside the admin UI on purpose, so a stolen admin session can never leak your database key.

## 2. Admin login
Default password is **`admin`** — visit `/admin` and sign in. To change it, set `ADMIN_PASSWORD` in your environment and redeploy.

**Nobody can see the password.** Verified by automated test:
- It is checked once, server-side, with a constant-time comparison and never sent back to the browser.
- Your session is a **signed, httpOnly cookie** — `localStorage` and `sessionStorage` are provably empty, and `document.cookie` returns `""` (JavaScript physically cannot read it, so no XSS or browser extension can steal it).
- Failed logins are rate-limited (8 per 10 min per IP).

How the login is secured:
- The password is checked once, server-side, with a constant-time comparison.
- On success the server sets a **signed, httpOnly, Secure, SameSite cookie** (`admin_session`). It is *not* the password — it's an opaque token the server can verify but the browser's JavaScript cannot read, and it never appears in `localStorage`, `sessionStorage`, or any network response body.
- Every admin-only API route checks that cookie server-side before allowing changes.
- Failed logins are rate-limited (8 attempts / 10 minutes per IP, best-effort).
- The **Connections** tab in `/admin` shows a live "using default password" warning until you set `ADMIN_PASSWORD`.

Optional: set `ADMIN_SESSION_SECRET` to a random string so sessions remain valid across an `ADMIN_PASSWORD` change (otherwise sessions are invalidated automatically when the password changes, which is fine — just log in again).

## 3. Google Drive attach (optional)
Lets you attach a file from your own Google Drive to a project — by reference (a link), not a copy — instead of uploading it through this server.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → Library** → enable **Google Picker API**.
3. **APIs & Services → Credentials**:
   - Create an **OAuth 2.0 Client ID** (type: Web application). Add your site's URL (e.g. `https://your-site.vercel.app` and `http://localhost:3000`) under **Authorized JavaScript origins**.
   - Create an **API key**. Restrict it to the Picker API and your domain.
4. Set both as env vars:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `NEXT_PUBLIC_GOOGLE_API_KEY`
5. Redeploy. In `/admin` → **Files** tab, use "Attach from Google Drive" — it opens Google's own picker, you sign in and pick a file, and only a link + metadata is stored (nothing passes through this server).

These two values are meant to be public (they're restricted by domain in Google's console, the same way Google Maps/Sign-In keys work) — that's why they're prefixed `NEXT_PUBLIC_`.

## 4. Visitor analytics
Built in, first-party, no third-party trackers or cookies beyond the admin session itself. A lightweight beacon records pageviews (path, referrer, device, browser, session ID from `sessionStorage`) to your own Supabase `analytics_events` table. View it in `/admin` → **Analytics**: totals, a 14-day trend chart, top pages, top referrers, and device breakdown.

## Deploy on Vercel
1. Push this repo to GitHub (see below).
2. Vercel → **Add New → Project** → import the repo.
3. Add all the environment variables from `.env.example` under **Settings → Environment Variables**.
4. Deploy. No MongoDB, no `output: standalone` — it's a clean serverless build.

## Push to GitHub
```bash
git init
git add .
git commit -m "Institutional portfolio: Supabase, secure admin auth, Drive attach, analytics"
git branch -M main
git remote add origin https://github.com/yourname/your-repo.git
git push -u origin main
```

## Editing content
Everything is edited at `/admin` — Owner & Intelligence, Philosophy quotes, Projects, Skills, Experience, Education, Certifications, Research, Categories, Files, Analytics, Connections. No code changes required.

## Architecture
- `app/` — routes; `page.js` is a thin composition shell.
- `components/sections/*` — one component per section.
- `components/shared/*` — `site-context`, `primitives`, `analytics-beacon`.
- `lib/db.js` — Supabase Postgres data layer (content, files, contacts, analytics).
- `lib/auth.js` — cookie-session admin auth (signing, verification, rate limiting).
- `lib/google-drive-client.js` — client-side Drive Picker integration.
- `app/api/[[...path]]/route.js` — content / files / contact / admin / analytics / tracking API.

See `IMPLEMENTATION_NOTES.md` for the full change log.


## Matching the reference design exactly

Two things ship as tasteful defaults and need your own assets for a verbatim match:

**1. Project cover photos.** Cards render `imageUrl` as a real photo. Defaults are generated abstract covers in `/public/covers/`. To use real photography: admin → Files → upload → copy URL → admin → Projects → cover image.

**2. Brand logos** (Excel, Bloomberg, Harvard, CFA, company marks). Trademarked artwork isn't bundled. Using official assets on your own site to identify tools you use is legitimate, so every icon takes a logo URL:
- Microsoft brand assets: https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks
- Most brands publish a press/brand-assets page with official SVGs.
- Then: admin → Files → upload the SVG → paste the URL into the tool / certification / experience `logoUrl` field.

Until then, tools render as brand-coloured monogram tiles, which look intentional rather than broken.

## Investment Lab (`/lab`)

An institutional research module: a **hypothetical** portfolio kept as a transparent record of process — construction, valuation, risk, and post-investment review. The disclosure is part of the data model and renders above every section.

### Everything is CMS-editable
Admin → **Lab · Portfolio** (name, capital, start date, base currency, benchmark, FX rates, risk-free rate, philosophy, disclosure), **Lab · Instruments** (full CRUD: 25+ fields per instrument plus a 13-field investment memo), **Lab · Journal**, **Lab · Letters**, **Lab · Research**. No Lab value is hardcoded.

### Market data (optional)
```
MARKET_DATA_PROVIDER=fmp        # or finnhub | twelvedata | alphavantage | yahoo | none
MARKET_DATA_API_KEY=your_key
```
Provider logic lives only in `lib/market-data.js` behind `getQuotes()` / `getHistory()`. Swapping vendors is a one-line env change. Every adapter returns the same normalised shape; a missing metric is `null` and renders **N/A** — never a fabricated 0. Quotes cache for 10 minutes to respect free-tier limits. With no provider set, the Lab runs on admin-entered prices.

### Why Risk Metrics starts empty
Sharpe, beta, drawdown and VaR are properties of a return **series**. With a single snapshot there is no honest way to compute them, so the page says so instead of printing confident nonsense. Populate it by recording daily valuations:

- `vercel.json` already schedules `POST /api/lab/snapshot` on weekdays at 12:30 UTC.
- Set `CRON_SECRET` in Vercel; the endpoint accepts `Authorization: Bearer $CRON_SECRET` or an admin session.
- After ~30 trading days every metric populates automatically from `lab_valuations`.

### Multi-currency
FX rates are set per currency in Lab · Portfolio (units of base per 1 unit). A holding whose currency has no rate is **excluded from totals and flagged**, rather than silently summed 1:1 — the bug that would otherwise understate a USD sleeve by ~83x on an INR book.

### Finance library
`lib/finance.js` is pure, dependency-free, and unit-tested — run `node scripts/test-finance.mjs` (82 assertions covering CAGR, Sharpe/Sortino/Treynor, Jensen alpha, beta, information ratio, tracking error, Calmar, Omega, max drawdown, VaR/CVaR, contribution attribution, FX conversion, and a seeded GBM Monte Carlo).
