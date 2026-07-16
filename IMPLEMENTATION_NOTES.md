# Implementation Notes

## Shipped (all build-verified — `next build` passes; SSR smoke-tested)

### Foundation
- **Fonts:** Fraunces (display serif — Canela/IvyPresto are licensed), IBM Plex Mono (numbers/tables), Inter (body); self-hosted via `next/font`.
- **Tokens:** `gold`, `terminal` (Bloomberg green), `slate` accents; **violet removed**; restrained glass; faint grain; tabular figures.
- **Portrait:** upload cropped 4:5, graded to the charcoal palette → `public/portrait/deepak-hero.{webp,jpg}` (+LQIP), wired as default and rendered via `next/image`.

### Backend — MongoDB → Supabase Postgres
- New `lib/db.js` (Supabase data layer); `app/api/[[...path]]/route.js` rewritten; `mongodb` dependency removed; `output: 'standalone'` dropped → clean Vercel build.
- `supabase/schema.sql` — `site_content`, `contact_requests`, `files` (RLS on; service-role server-side).
- Contact list endpoint now admin-gated; security headers tightened (SAMEORIGIN, nosniff, referrer-policy, CSP frame-ancestors 'self').

### Structure
- 1,163-line `app/page.js` monolith → 20 modules in `components/shared/*` + `components/sections/*`; `page.js` is a 70-line shell.

### Sections
- **Hero** redesigned: portrait + "I help companies make better capital allocation decisions." + expertise chips + dual CTAs (View Transactions / View Projects).
- **Deepak Intelligence** panel (replaces random stats): Position, Company, Latest Work/Model/Research, Current Focus + Deal Pipeline / Models Built / Companies Evaluated / Projects Delivered.
- **Philosophy** (replaces the market ticker): large editorial quote, multiple quotes, smooth blur/fade rotation, dot nav.
- New **Education**, **Certifications** (gallery), **Research**, and **About** sections — all data-driven.

### Admin (CMS parity for new content)
- Owner editor extended (hero headline/summary + full Intelligence panel).
- New editors: Philosophy, Education, Certifications, Research. Every new field is editable — no code changes needed.

### SEO / perf
- Full metadata + OpenGraph + Twitter; JSON-LD `Person`; `sitemap.xml`; `robots.txt`; `next/image` (AVIF/WebP) enabled.

## Recommended next pass (not yet done)
- **Dedicated detail routes** — `/projects/[id]` and `/transactions/[id]` as full pitchbook pages (Situation → Objective → Approach → Analysis → Valuation → Recommendation → Outcome → Lessons + downloads/charts). Today these open in the existing dialog. This needs a richer transaction schema + an admin editor for it.
- **Experience timeline** — upgrade to scroll-driven "line grows / cards slide in / current company glows".
- **Skills & Tools** — add real brand icons (Excel/Bloomberg/Python…) and category filters.
- **Lighthouse tuning** — consider moving content fetch server-side (RSC) so real content is in the first paint (currently seeds server-side, hydrates real content client-side).

---

## Round 3 — secure auth, Supabase self-connect, Google Drive attach, visitor analytics

All build-verified (`next build` passes) and runtime-tested (full auth flow curl-tested against a live dev server: wrong password → 401, correct password → httpOnly cookie with no password/token in the response body, session check, admin-gated routes reject without the cookie, logout clears it).

### Secure admin auth (`lib/auth.js`)
- Password is **`admin`** by default (override with `ADMIN_PASSWORD`).
- Login now sets a **signed, httpOnly, Secure, SameSite=lax session cookie** — the password is checked once server-side (constant-time comparison) and never sent back to the browser. Previously the "token" *was* the plaintext password, stored in `localStorage` and sent on every request as a visible header — that's gone.
- Every admin route (`/content` PUT, `/content/reset`, `/files/*` mutations, `/admin/analytics`, `/admin/status`) checks the cookie server-side via `isAdminRequest()`.
- Best-effort rate limiting on `/admin/login` (8 attempts / 10 min / IP).
- `/admin/session` (check), `/admin/logout` (clear) added.
- Admin UI: `useAdminSession()` hook + `adminFetch()` wrapper that auto-detects an expired session (401) and drops back to the login screen.

### Bring-your-own Supabase
- No secrets are entered inside the admin UI (by design — an admin session should never be able to leak a database key). Instead: run `supabase/schema.sql` in your project, set `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in your deploy environment.
- New **Connections** tab in `/admin` shows live status: Supabase configured/reachable (with masked project host), Google Drive configured, and whether you're still on the default password — with inline setup instructions for each.

### Google Drive attach
- `lib/google-drive-client.js` — client-side Google Identity Services (OAuth token client) + Picker API integration. No server-side OAuth secret needed; both env vars (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_API_KEY`) are public/client-side by design, restricted to your domain in Google Cloud Console.
- New `/api/files/attach-drive` endpoint stores the picked file **by reference** (link + metadata) — no binary passes through the server. `files.source` column (`upload` | `google-drive`) distinguishes them; Drive-sourced files show a Drive badge in the Files tab.
- **Not live-tested end-to-end** — that requires real Google Cloud OAuth credentials, which this environment doesn't have. The Picker/token-client code follows Google's documented client-side pattern exactly; you'll need to verify the actual consent screen once you've set up your own Client ID (steps in README).

### Visitor analytics
- `analytics_events` Supabase table (session id, path, referrer, device, browser, recruiter-mode flag, timestamp). No PII, no third-party trackers, no cross-site cookies.
- `components/shared/analytics-beacon.jsx` — fires one pageview per session mount to `/api/track` (public, fail-open — never blocks the page even if Supabase is unreachable).
- New **Analytics** tab in `/admin`: total views, unique visitors, Recruiter Mode views, a 14-day SVG trend chart (built with plain SVG — no new chart dependency), top pages, top referrers, device breakdown.

### Known limitation
Login rate limiting is in-memory per server instance — on serverless (Vercel), each cold start resets it. It's still a real deterrent (most abuse comes from sustained single-instance hammering) but isn't a substitute for setting a real `ADMIN_PASSWORD`.

---

## Round 4 — institutional density, recruiter slideshow, Supabase wizard

### The black gaps — root cause found (this was a real bug, not just spacing)
Two separate causes, both fixed:

1. **Padding.** 10 sections were `py-24 md:py-32` (+ Philosophy at `py-48`), stacking ~256px of dead black between every section. All sections now run on a tight `py-12 md:py-16` rhythm via new `components/shared/layout.jsx` primitives (`Shell`, `Section`, `Panel`, `SectionHead`).

2. **Stranded reveals (the actual culprit).** `RevealText` used framer-motion's `whileInView`, which depends solely on IntersectionObserver. IO callbacks are async and get **dropped during fast scrolling** — and because the initial state was `opacity: 0`, any missed element stayed invisible *permanently*. Measured in a headless browser: the Transactions section was rendering a **2016px void** with cards stuck at `opacity: 0, translateY(24px)`. `RevealText` now pairs the observer with a synchronous `getBoundingClientRect` scroll check (which cannot be dropped) and degrades to visible if IO is unavailable. Verified with a fast-scroll stress test — all cards resolve to `opacity: 1`.

**Measured result (headless, 1440px wide, full render):**
- dead space: **3232px (34.2%) → 640px (6.8%)**
- largest gap: **2016px → 144px**

### Layout, restructured to the reference
- **Hero** — portrait + institutional profile panel (Currently / Expertise / Availability), 4-stat strip, Latest Activity feed. All in one viewport.
- **Philosophy** — was a `py-48` full-height section; now a compact bar: quote + 4 animated principles inline (188px total).
- **Experience + Education** — were two stacked sections; now a **side-by-side row** with scroll-drawn timeline rails, expandable rows, and a pulsing node on the current role.
- **Skills & Tools** — single dense 3-column card: proficiency bars / tool monogram grid / expertise chips.
- **Certifications** — compact 5-across row with a restrained 5° 3D tilt.
- **Chapters** folded into **About** (its admin editor still drives live content — no feature lost).

### Colour & type
- Exact spec palette wired to tokens: `#090B10` bg, `#11161D` card, **`#C8A76A` gold**, `#F5F2EA` text, `#8B9098` muted, `#32D583` success, `#F04438` error.
- **Every Tailwind `amber-*` purged** (0 references remain). The old accent was `#fbbf24` — bright yellow, explicitly against spec.
- Faint financial substrate (`.fin-bg`): DCF/WACC/multiples/IRR set at **1.8% opacity** — subconscious only.

### Recruiter mode — rebuilt as a slideshow
Was a section-toggle. Now a full-screen deck: **Current Role → Education → Experience → Skills → Contact**, with segment progress bars, 7s autoplay + pause, arrow-key/Escape nav, click-to-jump, and scroll lock.

### Believable numbers
Seed stats replaced per spec ("no fake billion-dollar numbers"): `$4.8B+` → Deal Pipeline **7**, Models Built **67**, Companies Screened **182**, Hours Saved Using AI **1,200+**.

### Supabase connection wizard (admin → Connections)
Paste Project URL + `service_role` key + bucket → **Test connection** live-probes your real project and reports per-table status, auth status, and bucket presence, then gives copy-to-clipboard env vars.

**Why there is no "save & connect permanently" button — this is a hard constraint, not an omission:**
1. **Chicken-and-egg** — the credentials *are* the database access; there's nowhere to persist them before they work.
2. **Serverless storage is ephemeral/read-only** — anything written at runtime on Vercel dies on the next cold start.
3. **Security** — a `service_role` key is full, RLS-bypassing access. Making it writable from a web form means any stolen admin session owns the entire database.

The credentials are validated in memory and **never stored**. Permanence comes from Vercel env vars, which is the correct place for them.

---

## Round 4 — institutional density pass, recruiter slideshow, Supabase connect UI

Everything below is build-verified **and** verified in a real headless browser (DOM measurement + automated interaction tests), not assumed.

### The black-gap problem — measured, fixed, re-measured
The cause was structural, not cosmetic: 10 sections at `py-24 md:py-32` (≈256px of dead black between each), plus stacked full-height sections with sparse content.

| | Before | After |
|---|---|---|
| Page height | 9,446px | **5,686px** (−40%) |
| Projects section | 2,606px | **566px** |
| Transactions section | 2,159px | **440px** |
| Gaps between sections | — | **zero** (all contiguous, DOM-verified) |
| Dead space | 63% (incl. artifacts) | **25.7%**, largest run 257px |

What changed:
- New `components/shared/layout.jsx` primitives (`Shell`, `Section`, `Panel`, `SectionHead`, `Chip`, `MetaPair`, `Reveal`) enforcing one dense, content-led rhythm.
- **Philosophy** → compact bar (quote + 4 animated principles inline) instead of a `py-48` full-height section.
- **Experience + Education** → one side-by-side row with scroll-drawn timeline rails, replacing two stacked sections.
- **Skills & Tools** → single 3-column panel (proficiency bars / tool grid / expertise chips).
- **Projects & Transactions** → compact cards, featured-first with expand-in-place ("View all"), instead of dumping all 11/10 tall cards.
- **Certifications** → 5-across row with a restrained 5° 3D tilt.
- Chapters folded into About (its admin editor still drives live content — no feature lost).

### Colour system corrected to spec
The old accent was Tailwind `amber-400` = **#fbbf24, a bright yellow** — directly against the "no bright yellow / no neon" rule. Every `amber-*` reference across the codebase (54 occurrences in 9 files) was migrated to the exact institutional palette: `#090B10` bg, `#11161D` panel, **`#C8A76A` gold**, `#F5F2EA` warm white, `#8B9098` muted, `#32D583` success, `#F04438` error. Zero `amber` references remain.

Also added: `.fin-bg` — a ~1.8%-opacity financial substrate (DCF/WACC/terminal-value formulas, EV/EBITDA + IRR + MoIC multiples, football-field ranges, DRHP/S-1 references). Felt, not read.

### Recruiter Mode — rebuilt as a slideshow
Previously a section-toggle that didn't communicate anything. Now a full-screen presentation: **Current Role → Education → Experience → Skills → Contact**, with 7s autoplay, segmented progress bars, keyboard control (←/→/Space/Esc), pause, jump-to-section, and scroll-lock.

### Stats made believable
Spec said no fake $Bn figures; seed data had `$4.8B+`. Replaced with the reference's honest set: Deal Pipeline 7 · Models Built 67 · Companies Screened 182 · Hours Saved Using AI 1,200+, plus a live "Latest Activity" feed.

### Supabase connection UI (Connections tab)
A real setup wizard: paste Project URL + `service_role` key → **Test connection** → the server live-probes all four tables and the storage bucket → on success it hands back the exact env vars with one-click copy, and flags `alreadyLive`.

API-verified: unauthenticated → 401 · malformed URL → friendly error · non-Supabase host → rejected · missing fields → 400 · unreachable project → graceful per-table diagnostics.

**Why there is no "save permanently" button** — this is a hard constraint, not an omission:
1. **Chicken-and-egg.** The only permanent store this app has *is* Supabase. Saving the Supabase key into Supabase needs the key you're trying to set.
2. **Vercel has no writable disk.** Serverless functions run read-only and ephemeral; anything written is gone next request.
3. **Security.** `service_role` bypasses all row-level security. In Vercel's encrypted env vars, a stolen admin session can never read it. Env vars *are* the permanent store — set once, never touched again.
The wizard explains all of this inline via a disclosure.

### Verified by automated browser test
- Login gate renders; password `admin` authenticates.
- `localStorage` = `[]`, `sessionStorage` = `[]`, `document.cookie` = `""` → password/session provably not exposed to client JS.
- Connections tab renders the Supabase wizard; credential tester returns correct diagnostics.

### Still open (honest list)
- **Google Drive** consent screen is still untested end-to-end — needs real Google Cloud OAuth credentials this environment doesn't have. Code follows Google's documented Picker/GIS pattern.
- **Dedicated `/projects/[id]` and `/transactions/[id]` routes** — still open in the existing dialog rather than full pitchbook pages.
- **Models** and **Insights** nav entries from the spec are not yet distinct sections (Insights is served by Research; Models has no data model yet).
- **Lighthouse 95+** unmeasured here; content still hydrates client-side (server paints seed first). Moving the fetch to a server component would close it.

---

## Round 5 — exact match to the reference design

Verified against the reference by reading **computed styles from a live headless browser**, not by eye:

| Spec | Rendered | |
|---|---|---|
| Background `#090B10` | `#090B10` | ✅ |
| Text `#F5F2EA` | `#F5F2EA` | ✅ |
| Gold `#C8A76A` on "capital allocation" | `#C8A76A` | ✅ |
| Display serif | Fraunces | ✅ |
| Body | Inter | ✅ |
| Numbers | IBM Plex Mono | ✅ |
| Nav order | Home · Transactions · Projects · Models · Research · Experience · Education · Skills · Certificates · Insights | ✅ exact |

### Added this round
- **Nav** — Models + Insights entries, gold-outline Résumé, filled Let's Talk, contrast toggle. Matches the reference lockup exactly.
- **Project cards** — real photo thumbnails with `object-cover` + gradient scrim, INDUSTRY/GEOGRAPHY meta rail, tool chips, "View project", and carousel page dots. Ships with 8 generated institutional cover images (`/public/covers/*.webp`, ~1.4KB each); every card's `imageUrl` is admin-editable, so dropping in real photography gives the reference look verbatim.
- **Models section** (`#models`) — deal-desk index of six models (3-statement, DCF, LBO, merger, comps, FP&A) with type/subject/year/complexity/tools and download-or-on-request state. New `models` array in the CMS.
- **Footer** — rebuilt to the reference: Let's Connect blurb · contact rail (email/phone/location/availability) · Quick Links · Download Resume card · Schedule a Discussion CTA · legal bar.
- **Tool icons** — now accept `logoUrl`. Supply an official brand asset and it renders; otherwise a clean brand-coloured monogram tile.
- `#research` kept as an alias anchor on the Insights section so both nav links resolve.

### Page geometry
6,444px, all sections contiguous, zero inter-section gaps (DOM-measured). Models added +588px of real content.

### Two deliberate deviations from "100% exact" — both intentional
1. **Stock photography.** The reference's hospital/pipes/retail-aisle/fintech photos are licensed stock images I don't have and can't recreate. The cards are built to display real photos; generated institutional cover art is the default. Drop your own images in via admin → Projects → cover image for a verbatim match.
2. **Brand logo artwork.** The reference shows Microsoft/Bloomberg/Harvard/CFA marks. Hand-reproducing trademarked logo artwork isn't something I'll do — but using official assets on your own site to identify tools you actually use is legitimate (nominative use). So the icon system takes a `logoUrl`: download the official SVG/PNG from each brand's press/assets page, upload via admin → Files, paste the URL, and you get the exact marks. Same for certification and company logos (`logoUrl` on every certification and experience entry).

---

## Round 6 — Investment Lab

A new module at `/lab`. Nothing existing was removed or rewritten; the Lab plugs into the same CMS (`content.lab`), the same auth, and the same design system.

### Verified, not asserted
- **`node scripts/test-finance.mjs` → 82/82 pass.** Includes the assertions that catch real bugs: Sharpe returns `null` (not `Infinity`) at zero volatility; beta-vs-self = 1 and beta of a 2x-levered series = 2; contribution sums exactly to the book's money-weighted return; the seeded GBM median tracks `exp(μt)`, confirming the log-space drift correction (the naive implementation overstates outcomes).
- **Browser-tested**: all 12 sidebar sections render; 9 holdings rows; memo modal opens; Monte Carlo shows 5 live sliders + median + probability-of-loss; Risk shows an honest "not enough history" state with 15 × N/A rather than fabricated zeros.
- **API-tested**: `/api/lab/quotes` → 200 and degrades to empty data when Supabase/provider are absent (never 500s into the page); `/api/lab/snapshot` → 401 without auth.

### A real bug the tests caught
The seed book holds both NSE and NASDAQ names. Aggregation was summing **$ and ₹ at 1:1** — Microsoft showed as ₹37,890 (0.34% of book) instead of ₹31.64 L (26.96%), understating total return by 5.6pp. Fixed with an FX layer: `positionMetrics`/`portfolioSummary`/`holdingWeights`/`contributionAnalysis` all take base currency + rates; a missing rate **excludes and flags** the position rather than guessing. Locked behind 13 regression tests.

### Built
- `lib/finance.js` — 30+ pure functions. Every one returns `null` on insufficient input; the UI renders that as N/A.
- `lib/market-data.js` — 5 provider adapters (FMP, Finnhub, Twelve Data, Alpha Vantage, Yahoo) behind one normalised interface, 10-min cache, never throws into the request path.
- `lib/lab-data.js` — settings, 9 instruments with full 13-field memos, 7 journal entries, 2 quarterly letters, 3 research notes.
- `/lab` — sidebar shell + Overview, Portfolio, Holdings (filter/sort/paginate/CSV+Excel export), Research Notes, Journal, Transactions, Analytics, Risk, Letters, Attribution, Monte Carlo, Settings.
- Admin: 5 new editors — Portfolio settings (incl. FX), Instruments (25+ fields + memo), Journal, Letters, Research.
- Schema: `lab_valuations`, `lab_quotes`. `vercel.json` cron for daily snapshots.
- Nav: "Investment Lab" added.

### Deliberately honest gaps
- **Dedicated `/lab/holdings/[id]` route** — memos currently open in a modal. Peer comparison and quarterly-results blocks are not built.
- **Analytics charts** — attribution (position + sector) is live; rolling returns, drawdown chart, calendar heatmap and correlation matrix are not. They need the `lab_valuations` history to exist first, which is why the snapshot cron ships now.
- **Markdown rendering** in research notes stores/edits markdown but renders as plain text (no renderer added, to avoid a new dependency).
- **Drag & drop ordering** of instruments — `order` field exists and the list editor has up/down controls; true DnD is not wired.
- **Lighthouse** unmeasured for `/lab`.


---

## Round 6b — Investment Lab moved into the landing scroll

**Correction.** Round 6 built the Lab as a destination at `/lab`, reachable only via a nav click. That was the wrong product call for the stated goal: a recruiter gives the landing page ~15 seconds, so the module described as "the strongest differentiator" was the one thing most of them would never see.

`components/sections/investment-lab.jsx` now renders the Lab **in the landing-page scroll**, between Research and Experience (matching the spec's nav order). Nav `Investment Lab` → `#lab`; the full module is one click from inside the section.

It is built as a *proof*, not a teaser:
- **Real numbers**, computed live through the same `lib/finance.js` the Lab uses — portfolio value, absolute return, CAGR, holdings/sector counts, asset allocation rail, and the four largest positions with live weights and returns.
- **The disclosure renders before any number** — it is not deferred to the full Lab.
- **Philosophy + a documented mistake** from the journal. This is the deliberate centrepiece: a losing position kept in the record is far harder to fake than a winner, and it is what separates "likes the stock market" from "allocates capital".
- **CTA** into the full module, with an inventory of what's inside.

Verified in a headless browser: section renders at y=2955 (821px), computed value ₹1.17 Cr, disclosure/philosophy/journal/CTA all present, nav wired, section order `top > work > transactions > models > insights > lab > experience > skills > certificates > about > contact`, **zero JS errors**. Landing page 7,265px.

**Deliberate tradeoff:** the landing section uses admin-entered prices (no extra API round-trip on first paint); `/lab` fetches live quotes. Keeps the landing fast while the Lab stays current.

---

## Round 7 — three reported bugs: reproduced, root-caused, fixed, re-verified

Each was reproduced in a headless browser first. Two of the three had causes different from what the symptom suggested.

### 1. Recruiter button "doesn't work"
**Cause:** the button carried `hidden sm:inline-flex` — it did not exist below 640px. On a phone there was no Recruiter button in the top bar at all; it only lived in the drawer. The button worked fine on desktop, which is why it looked intermittent.
**Fix:** always rendered, icon-only under 420px, gold-outlined as a primary CTA, `aria-label` added.
**Verified:** present + visible + opens on iPhone SE (375), iPhone 14 (390), tablet (768).

### 2. Clicking the nav ribbon "gets stuck"
Two independent causes, both real:

**(a) No scroll offset.** The nav is `position: fixed` at 56px, and nothing in the codebase set `scroll-margin-top` or `scroll-padding-top`. Every anchor scrolled its section to y=0 — directly *behind* the nav — so the heading was invisible and the page looked broken on arrival.
**Fix:** `html { scroll-padding-top: 72px }` + `section[id] { scroll-margin-top: 72px }` (belt-and-braces for `scrollIntoView`, which ignores scroll-padding on some engines), plus `prefers-reduced-motion` support.
**Verified:** every section now lands at top=144px against navBottom=57px.

**(b) The header overflowed and squeezed the links to zero width.** The header used the 1240px content shell (1176px usable), but logo (~200) + 10 nav links (~850) + actions (~360) ≈ 1410px. Flex children can't shrink below min-content without `min-w-0`, so the links were clipped out and became unclickable. **This predated the reported bug and is very likely what "the ribbon is stuck" actually was.**
**Fix:** header gets its own wider rail (`xl:max-w-[1460px]`), nav becomes `flex-1 min-w-0 justify-center` with `shrink-0 whitespace-nowrap` links at tighter tracking, and Résumé steps out of the header between xl and 2xl (it remains in the hero, footer, and drawer).
**Verified:** 11/11 links visible with no overflow at 1280 / 1440 / 1600 / 1920.

No scroll-lock leak was found: `body.overflow` returns to empty after closing the slideshow, and scrolling works afterwards.

### 3. Models "structure not in line"
**Cause:** confirmed and measured. Each row was its own CSS Grid container with `grid-cols-[1.7fr_0.7fr_…]`. Grid tracks resolve *per container*, so every row sized its columns from its own content — header col at x=486 against rows at x=491 and x=518, and rows disagreeing with each other.
**Fix:** rebuilt as a real `<table>` with `table-fixed` + `<colgroup>`, so one column model is shared by every row. Sortable headers retained.
**Verified:** header `[133,486,597,817,906,1049,1237]` — all 6 rows byte-identical.

### Self-inflicted regression, caught by the same tests
Adding an `xs` breakpoint via `theme.screens` **replaced Tailwind's entire default breakpoint set** (`sm`/`md`/`lg`/`xl`/`2xl` all vanished), so `xl:flex` stopped existing and the nav rendered at zero width at every viewport. Moved to `theme.extend.screens`, which is additive. Worth noting because the build stayed green throughout — only the browser measurement caught it.
