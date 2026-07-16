import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { getSupabase, ensureBucket, BUCKET, categoryFromMime, slugifyName } from '@/lib/supabase'
import { SEED_CONTENT } from '@/lib/portfolio-data'
import {
  getContent, putContent, resetContent,
  insertContact, listContacts,
  insertFile, listFiles, getFile, deleteFile, updateFile,
  insertAnalyticsEvent, getAnalyticsSummary,
} from '@/lib/db'
import { getQuotes, getHistory, providerStatus, clearMarketCache } from '@/lib/market-data'
import {
  ADMIN_COOKIE_NAME, SESSION_MAX_AGE, checkPassword, buildSessionToken, isAdminRequest,
  isRateLimited, recordFailure, clearFailures, clientIp,
} from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// Session-cookie auth. The password is checked once at /admin/login and
// never leaves the server again — the browser only ever holds an opaque,
// httpOnly, signed session cookie that client-side JS cannot read.
function requireAdmin(request) {
  return isAdminRequest(request)
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    // Health
    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'Portfolio API online', ts: Date.now() }))
    }

    // ---------------- Contact ----------------
    if (route === '/contact' && method === 'POST') {
      const body = await request.json()
      if (!body.email || !body.message) {
        return handleCORS(NextResponse.json({ error: 'email and message are required' }, { status: 400 }))
      }
      const record = {
        id: uuidv4(),
        name: body.name || '',
        email: body.email,
        company: body.company || '',
        role: body.role || '',
        message: body.message,
        recruiterMode: !!body.recruiterMode,
      }
      await insertContact(record)
      return handleCORS(NextResponse.json({ ok: true, request: record }))
    }
    if (route === '/contact' && method === 'GET') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      return handleCORS(NextResponse.json(await listContacts()))
    }

    // ---------------- Visitor analytics ----------------
    if (route === '/track' && method === 'POST') {
      try {
        const body = await request.json()
        if (!body.sessionId) return handleCORS(NextResponse.json({ ok: true })) // fail open, never block the page
        await insertAnalyticsEvent(body)
      } catch (e) {
        console.error('track error:', e?.message)
      }
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route === '/admin/analytics' && method === 'GET') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const days = Number(new URL(request.url).searchParams.get('days') || 14)
      const summary = await getAnalyticsSummary({ days: Math.min(Math.max(days, 1), 90) })
      return handleCORS(NextResponse.json(summary))
    }

    // ---------------- Files (uploads + Google Drive attachments) ----------------
    if (route === '/files/upload' && method === 'POST') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      await ensureBucket()
      const supabase = getSupabase()

      const form = await request.formData()
      const file = form.get('file')
      const projectId = form.get('projectId') || null
      const projectTitle = form.get('projectTitle') || null
      const label = form.get('label') || null

      if (!file || typeof file === 'string') {
        return handleCORS(NextResponse.json({ error: 'file is required' }, { status: 400 }))
      }
      const originalName = file.name || 'upload.bin'
      const mimeType = file.type || 'application/octet-stream'
      const size = file.size || 0
      if (size > 50 * 1024 * 1024) {
        return handleCORS(NextResponse.json({ error: 'file exceeds 50MB' }, { status: 413 }))
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const id = uuidv4()
      const safeName = slugifyName(originalName)
      const key = `${projectId || 'unassigned'}/${Date.now()}-${id.slice(0, 8)}-${safeName}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buffer, { contentType: mimeType, upsert: false })
      if (upErr) {
        return handleCORS(NextResponse.json({ error: 'storage upload failed', detail: upErr.message }, { status: 502 }))
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key)

      const record = {
        id,
        originalName,
        label: label || originalName,
        mimeType,
        size,
        category: categoryFromMime(mimeType, originalName),
        storageKey: key,
        publicUrl: pub?.publicUrl,
        projectId: projectId || null,
        projectTitle: projectTitle || null,
        source: 'upload',
      }
      await insertFile(record)
      return handleCORS(NextResponse.json({ ok: true, file: record }, { status: 201 }))
    }

    // Attach a Google Drive file by reference (no binary passes through our
    // server — the browser picked it directly via the Drive Picker).
    if (route === '/files/attach-drive' && method === 'POST') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const body = await request.json()
      if (!body?.url || !body?.name) {
        return handleCORS(NextResponse.json({ error: 'name and url are required' }, { status: 400 }))
      }
      const record = {
        id: uuidv4(),
        originalName: body.name,
        label: body.label || body.name,
        mimeType: body.mimeType || 'application/vnd.google-apps.file',
        size: body.size || 0,
        category: categoryFromMime(body.mimeType || '', body.name),
        storageKey: null,
        publicUrl: body.url,
        projectId: body.projectId || null,
        projectTitle: body.projectTitle || null,
        source: 'google-drive',
      }
      await insertFile(record)
      return handleCORS(NextResponse.json({ ok: true, file: record }, { status: 201 }))
    }

    if (route === '/files' && method === 'GET') {
      const projectId = new URL(request.url).searchParams.get('projectId')
      return handleCORS(NextResponse.json(await listFiles(projectId)))
    }

    if (route.startsWith('/files/') && method === 'DELETE') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = route.replace('/files/', '')
      const found = await getFile(id)
      if (!found) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      if (found.raw.storage_key) {
        const supabase = getSupabase()
        await supabase.storage.from(BUCKET).remove([found.raw.storage_key])
      }
      await deleteFile(id)
      return handleCORS(NextResponse.json({ ok: true }))
    }

    if (route.startsWith('/files/') && method === 'PATCH') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const id = route.replace('/files/', '')
      const body = await request.json()
      const file = await updateFile(id, body)
      if (!file) return handleCORS(NextResponse.json({ error: 'not found' }, { status: 404 }))
      return handleCORS(NextResponse.json({ ok: true, file }))
    }

    // ---------------- Admin auth ----------------
    if (route === '/admin/login' && method === 'POST') {
      const ip = clientIp(request)
      if (isRateLimited(ip)) {
        return handleCORS(NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 }))
      }
      const body = await request.json().catch(() => ({}))
      if (!checkPassword(body?.password)) {
        recordFailure(ip)
        return handleCORS(NextResponse.json({ error: 'Invalid password' }, { status: 401 }))
      }
      clearFailures(ip)
      const res = handleCORS(NextResponse.json({ ok: true }))
      res.cookies.set(ADMIN_COOKIE_NAME, buildSessionToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE,
      })
      return res
    }
    if (route === '/admin/logout' && method === 'POST') {
      const res = handleCORS(NextResponse.json({ ok: true }))
      res.cookies.set(ADMIN_COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
      return res
    }
    if (route === '/admin/session' && method === 'GET') {
      return handleCORS(NextResponse.json({ authenticated: requireAdmin(request) }))
    }
    if (route === '/admin/status' && method === 'GET') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const supabaseUrl = process.env.SUPABASE_URL || ''
      let supabaseOk = false
      if (supabaseUrl) {
        try {
          const sb = getSupabase()
          const { error } = await sb.from('site_content').select('id').limit(1)
          supabaseOk = !error
        } catch { supabaseOk = false }
      }
      let urlHost = null
      try { urlHost = supabaseUrl ? new URL(supabaseUrl).host : null } catch {}
      return handleCORS(NextResponse.json({
        supabase: { configured: !!supabaseUrl, ok: supabaseOk, urlHost, bucket: BUCKET },
        googleDrive: {
          configured: !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_API_KEY),
        },
        admin: { usingDefaultPassword: !process.env.ADMIN_PASSWORD },
      }))
    }

    // Live-validate a Supabase credential pair WITHOUT persisting it.
    // Deliberately never stored: the service-role key is full DB access, and a
    // web-writable copy would mean an admin session could leak the database.
    // We verify, report exactly what's wrong, then the user pastes into Vercel.
    if (route === '/admin/test-supabase' && method === 'POST') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const body = await request.json().catch(() => ({}))
      const url = (body?.url || '').trim().replace(/\/+$/, '')
      const key = (body?.key || '').trim()
      const bucket = (body?.bucket || 'portfolio-files').trim()

      if (!url || !key) return handleCORS(NextResponse.json({ ok: false, error: 'Project URL and service_role key are both required.' }, { status: 400 }))
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
        return handleCORS(NextResponse.json({ ok: false, error: 'That does not look like a Supabase project URL. It should look like https://abcdefgh.supabase.co' }, { status: 400 }))
      }

      const checks = { reachable: false, authenticated: false, tables: {}, bucket: false }
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

        // table probes
        for (const t of ['site_content', 'files', 'contact_requests', 'analytics_events']) {
          const { error } = await sb.from(t).select('*', { count: 'exact', head: true }).limit(1)
          checks.tables[t] = !error
          if (!error) { checks.reachable = true; checks.authenticated = true }
          else if (/JWT|api key|Invalid/i.test(error.message || '')) checks.authenticated = false
        }
        // storage bucket probe
        try {
          const { data: buckets } = await sb.storage.listBuckets()
          checks.bucket = Array.isArray(buckets) && buckets.some((b) => b.name === bucket)
          if (Array.isArray(buckets)) checks.reachable = true
        } catch { /* storage probe is non-fatal */ }
      } catch (e) {
        return handleCORS(NextResponse.json({ ok: false, error: `Could not reach Supabase: ${e?.message || e}`, checks }, { status: 200 }))
      }

      const missing = Object.entries(checks.tables).filter(([, v]) => !v).map(([k]) => k)
      const ok = checks.authenticated && missing.length === 0
      return handleCORS(NextResponse.json({
        ok,
        checks,
        missingTables: missing,
        message: ok
          ? 'Credentials valid and all tables present.'
          : !checks.reachable ? 'Project URL unreachable — check the URL.'
          : !checks.authenticated ? 'Key rejected — make sure you copied the service_role key (not anon).'
          : `Connected, but these tables are missing: ${missing.join(', ')}. Run supabase/schema.sql in the SQL editor.`,
        // Exactly what to paste into the host's env settings.
        envVars: [
          { key: 'SUPABASE_URL', value: url },
          { key: 'SUPABASE_SERVICE_ROLE_KEY', value: key },
          { key: 'SUPABASE_BUCKET', value: bucket },
        ],
        alreadyLive: (process.env.SUPABASE_URL || '').replace(/\/+$/, '') === url,
      }))
    }

    // ---------------- Investment Lab ----------------

    // Live quotes for every ticker in the book + recorded valuation history.
    // Public: the Lab is a showcase. Always resolves; never blocks the page.
    if (route === '/lab/quotes' && method === 'GET') {
      let holdings = []
      try {
        const content = await getContent()
        holdings = content?.lab?.holdings || []
      } catch { /* fall through with empty book */ }

      const symbols = holdings
        .filter((h) => h.enabled !== false && h.ticker && h.exchange !== 'N/A')
        .map((h) => h.ticker)

      let quotes = {}
      try { quotes = await getQuotes(symbols) } catch (e) { console.error('lab/quotes:', e?.message) }

      let valuations = []
      try {
        const sb = getSupabase()
        const { data } = await sb
          .from('lab_valuations')
          .select('as_of,total_value,benchmark')
          .order('as_of', { ascending: true })
          .limit(1500)
        valuations = data || []
      } catch { /* table may not exist yet — Lab degrades to snapshot mode */ }

      return handleCORS(NextResponse.json({
        quotes,
        valuations,
        provider: providerStatus().id,
        asOf: new Date().toISOString(),
      }))
    }

    // Price history for one symbol (holding detail charts).
    if (route.startsWith('/lab/history/') && method === 'GET') {
      const symbol = decodeURIComponent(route.replace('/lab/history/', ''))
      const history = await getHistory(symbol)
      return handleCORS(NextResponse.json({ symbol, history }))
    }

    if (route === '/lab/status' && method === 'GET') {
      let valuations = 0
      try {
        const sb = getSupabase()
        const { count } = await sb.from('lab_valuations').select('*', { count: 'exact', head: true })
        valuations = count || 0
      } catch { /* not provisioned */ }
      return handleCORS(NextResponse.json({ provider: providerStatus(), valuations }))
    }

    /**
     * Record today's portfolio + benchmark valuation.
     * This is what turns a snapshot into a time series — and therefore what
     * makes Sharpe/beta/drawdown computable rather than fabricated.
     * Schedule daily (Vercel Cron). Protected by CRON_SECRET or an admin session.
     */
    if (route === '/lab/snapshot' && method === 'POST') {
      const secret = process.env.CRON_SECRET
      const auth = request.headers.get('authorization') || ''
      const viaCron = secret && auth === `Bearer ${secret}`
      if (!viaCron && !requireAdmin(request)) {
        return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      }

      const content = await getContent()
      const lab = content?.lab || {}
      const holdings = lab.holdings || []
      const settings = lab.settings || {}

      // Refresh prices before valuing, so the snapshot reflects the market.
      const symbols = holdings
        .filter((h) => h.enabled !== false && h.ticker && h.exchange !== 'N/A')
        .map((h) => h.ticker)
      let priced = holdings
      try {
        const quotes = await getQuotes(symbols)
        priced = holdings.map((h) => {
          const q = quotes[h.ticker]
          return q?.price ? { ...h, currentPrice: q.price } : h
        })
      } catch { /* fall back to stored prices */ }

      const { portfolioSummary } = await import('@/lib/finance')
      const sum = portfolioSummary(priced, settings)

      // Benchmark level for the same date, so beta/alpha are like-for-like.
      let benchmark = null
      try {
        const BENCH = { nifty50: '^NSEI', nifty500: '^CRSLDX', sensex: '^BSESN', nasdaq: '^IXIC', sp500: '^GSPC' }
        const bs = settings.benchmark === 'custom' ? settings.benchmarkCustomSymbol : BENCH[settings.benchmark]
        if (bs) {
          const bq = await getQuotes([bs])
          benchmark = bq[bs]?.price ?? null
        }
      } catch { /* benchmark optional */ }

      const asOf = new Date().toISOString().slice(0, 10)
      try {
        const sb = getSupabase()
        const { error } = await sb.from('lab_valuations').upsert({
          as_of: asOf,
          total_value: sum.totalValue,
          invested: sum.invested,
          cash: sum.cash,
          benchmark,
        }, { onConflict: 'as_of' })
        if (error) throw error
      } catch (e) {
        return handleCORS(NextResponse.json({ error: 'snapshot failed', detail: e?.message }, { status: 500 }))
      }

      return handleCORS(NextResponse.json({
        ok: true, asOf, totalValue: sum.totalValue, benchmark, priced: sum.livePrices,
      }))
    }

    if (route === '/lab/cache' && method === 'DELETE') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      return handleCORS(NextResponse.json({ ok: true, cleared: clearMarketCache() }))
    }

    // ---------------- Site content ----------------
    if (route === '/content' && method === 'GET') {
      return handleCORS(NextResponse.json(await getContent()))
    }
    if (route === '/content' && method === 'PUT') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const body = await request.json()
      if (!body || typeof body !== 'object') return handleCORS(NextResponse.json({ error: 'invalid payload' }, { status: 400 }))
      const shape = ['owner', 'chapters', 'categories', 'projects', 'skills', 'experience']
      for (const k of shape) if (!(k in body)) return handleCORS(NextResponse.json({ error: `missing key: ${k}` }, { status: 400 }))
      const updatedAt = await putContent(body)
      return handleCORS(NextResponse.json({ ok: true, updatedAt }))
    }
    if (route === '/content/reset' && method === 'POST') {
      if (!requireAdmin(request)) return handleCORS(NextResponse.json({ error: 'unauthorized' }, { status: 401 }))
      const content = await resetContent()
      return handleCORS(NextResponse.json({ ok: true, content }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error', detail: String(error?.message || error) }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
