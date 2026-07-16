/**
 * Market data service layer.
 *
 * Provider logic is NEVER called directly by routes or components. Everything
 * goes through `getQuotes()` / `getHistory()`, which resolve the active
 * provider from env at call time. Swapping vendors is a one-line env change:
 *
 *   MARKET_DATA_PROVIDER=fmp | finnhub | twelvedata | alphavantage | yahoo | none
 *   MARKET_DATA_API_KEY=...
 *
 * Design rules:
 *  - Every adapter returns the SAME normalised shape.
 *  - A missing metric is `null`, never 0 and never invented. `null` renders "N/A".
 *  - Failures never throw into the request path — they degrade to nulls so the
 *    Lab always renders using admin-entered prices.
 *  - Results are cached in-process to stay inside free-tier rate limits.
 */

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 min — free tiers are strict
const cache = new Map()

const now = () => Date.now()
const num = (x) => {
  if (x === null || x === undefined || x === '') return null
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

function cacheGet(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (now() - hit.t > CACHE_TTL_MS) { cache.delete(key); return null }
  return hit.v
}
function cacheSet(key, v) {
  cache.set(key, { t: now(), v })
  if (cache.size > 500) cache.delete(cache.keys().next().value)
  return v
}

/** The canonical quote shape. Every field defaults to null = "N/A". */
export function emptyQuote(symbol) {
  return {
    symbol,
    price: null, change: null, changePct: null,
    marketCap: null, peRatio: null, eps: null, dividendYield: null, dividend: null,
    beta: null, week52High: null, week52Low: null,
    volume: null, avgVolume: null, bookValue: null, priceToBook: null,
    roe: null, roce: null, debtToEquity: null, evToEbitda: null, freeCashFlow: null,
    sector: null, industry: null, currency: null, name: null,
    asOf: null, provider: null, stale: false,
  }
}

async function fetchJson(url, ms = 8000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json' } })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/* ------------------------------- adapters ------------------------------- */

const adapters = {
  /** Financial Modeling Prep */
  fmp: {
    id: 'fmp',
    label: 'Financial Modeling Prep',
    needsKey: true,
    async quotes(symbols, key) {
      const list = symbols.join(',')
      const [q, m] = await Promise.all([
        fetchJson(`https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(list)}?apikey=${key}`),
        fetchJson(`https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(list)}?apikey=${key}`),
      ])
      if (!Array.isArray(q)) return {}
      const profiles = Object.fromEntries((Array.isArray(m) ? m : []).map((p) => [p.symbol, p]))
      const out = {}
      for (const row of q) {
        const p = profiles[row.symbol] || {}
        out[row.symbol] = {
          ...emptyQuote(row.symbol),
          name: row.name ?? null,
          price: num(row.price),
          change: num(row.change),
          changePct: num(row.changesPercentage) === null ? null : num(row.changesPercentage) / 100,
          marketCap: num(row.marketCap),
          peRatio: num(row.pe),
          eps: num(row.eps),
          week52High: num(row.yearHigh),
          week52Low: num(row.yearLow),
          volume: num(row.volume),
          avgVolume: num(row.avgVolume),
          beta: num(p.beta),
          dividendYield: num(p.lastDiv) && num(row.price) ? num(p.lastDiv) / num(row.price) : null,
          dividend: num(p.lastDiv),
          sector: p.sector ?? null,
          industry: p.industry ?? null,
          currency: p.currency ?? null,
          asOf: new Date().toISOString(),
          provider: 'fmp',
        }
      }
      return out
    },
    async history(symbol, key) {
      const j = await fetchJson(`https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?serietype=line&apikey=${key}`)
      const hist = j?.historical
      if (!Array.isArray(hist)) return []
      return hist.map((d) => ({ date: d.date, close: num(d.close) })).filter((d) => d.close !== null).reverse()
    },
  },

  /** Finnhub */
  finnhub: {
    id: 'finnhub',
    label: 'Finnhub',
    needsKey: true,
    async quotes(symbols, key) {
      const out = {}
      for (const s of symbols) {
        const [q, p, m] = await Promise.all([
          fetchJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s)}&token=${key}`),
          fetchJson(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(s)}&token=${key}`),
          fetchJson(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(s)}&metric=all&token=${key}`),
        ])
        if (!q || num(q.c) === null) continue
        const mm = m?.metric || {}
        out[s] = {
          ...emptyQuote(s),
          name: p?.name ?? null,
          price: num(q.c),
          change: num(q.d),
          changePct: num(q.dp) === null ? null : num(q.dp) / 100,
          marketCap: num(p?.marketCapitalization) === null ? null : num(p.marketCapitalization) * 1e6,
          peRatio: num(mm.peTTM),
          eps: num(mm.epsTTM),
          beta: num(mm.beta),
          week52High: num(mm['52WeekHigh']),
          week52Low: num(mm['52WeekLow']),
          dividendYield: num(mm.dividendYieldIndicatedAnnual) === null ? null : num(mm.dividendYieldIndicatedAnnual) / 100,
          bookValue: num(mm.bookValuePerShareAnnual),
          priceToBook: num(mm.pbAnnual),
          roe: num(mm.roeTTM) === null ? null : num(mm.roeTTM) / 100,
          debtToEquity: num(mm['totalDebt/totalEquityAnnual']),
          currency: p?.currency ?? null,
          industry: p?.finnhubIndustry ?? null,
          asOf: new Date().toISOString(),
          provider: 'finnhub',
        }
      }
      return out
    },
    async history(symbol, key) {
      const to = Math.floor(Date.now() / 1000)
      const from = to - 3 * 365 * 24 * 3600
      const j = await fetchJson(`https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${key}`)
      if (!j || j.s !== 'ok' || !Array.isArray(j.c)) return []
      return j.c.map((c, i) => ({ date: new Date(j.t[i] * 1000).toISOString().slice(0, 10), close: num(c) }))
    },
  },

  /** Twelve Data */
  twelvedata: {
    id: 'twelvedata',
    label: 'Twelve Data',
    needsKey: true,
    async quotes(symbols, key) {
      const j = await fetchJson(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${key}`)
      if (!j) return {}
      const rows = j.symbol ? { [j.symbol]: j } : j
      const out = {}
      for (const [sym, r] of Object.entries(rows)) {
        if (!r || r.status === 'error') continue
        out[sym] = {
          ...emptyQuote(sym),
          name: r.name ?? null,
          price: num(r.close),
          change: num(r.change),
          changePct: num(r.percent_change) === null ? null : num(r.percent_change) / 100,
          week52High: num(r.fifty_two_week?.high),
          week52Low: num(r.fifty_two_week?.low),
          volume: num(r.volume),
          avgVolume: num(r.average_volume),
          currency: r.currency ?? null,
          asOf: new Date().toISOString(),
          provider: 'twelvedata',
        }
      }
      return out
    },
    async history(symbol, key) {
      const j = await fetchJson(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=750&apikey=${key}`)
      if (!j?.values) return []
      return j.values.map((v) => ({ date: v.datetime, close: num(v.close) })).filter((d) => d.close !== null).reverse()
    },
  },

  /** Alpha Vantage — 25 req/day on free tier; use sparingly. */
  alphavantage: {
    id: 'alphavantage',
    label: 'Alpha Vantage',
    needsKey: true,
    async quotes(symbols, key) {
      const out = {}
      for (const s of symbols) {
        const j = await fetchJson(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(s)}&apikey=${key}`)
        const q = j?.['Global Quote']
        if (!q || num(q['05. price']) === null) continue
        out[s] = {
          ...emptyQuote(s),
          price: num(q['05. price']),
          change: num(q['09. change']),
          changePct: num(String(q['10. change percent'] || '').replace('%', '')) === null ? null : num(String(q['10. change percent']).replace('%', '')) / 100,
          volume: num(q['06. volume']),
          asOf: new Date().toISOString(),
          provider: 'alphavantage',
        }
      }
      return out
    },
    async history(symbol, key) {
      const j = await fetchJson(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${key}`)
      const ts = j?.['Time Series (Daily)']
      if (!ts) return []
      return Object.entries(ts)
        .map(([date, v]) => ({ date, close: num(v['4. close']) }))
        .filter((d) => d.close !== null)
        .reverse()
    },
  },

  /**
   * Yahoo Finance — unofficial, keyless. Fallback only.
   * No API contract; treat outages as expected and degrade to nulls.
   */
  yahoo: {
    id: 'yahoo',
    label: 'Yahoo Finance (fallback)',
    needsKey: false,
    async quotes(symbols) {
      const j = await fetchJson(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`)
      const rows = j?.quoteResponse?.result
      if (!Array.isArray(rows)) return {}
      const out = {}
      for (const r of rows) {
        out[r.symbol] = {
          ...emptyQuote(r.symbol),
          name: r.longName ?? r.shortName ?? null,
          price: num(r.regularMarketPrice),
          change: num(r.regularMarketChange),
          changePct: num(r.regularMarketChangePercent) === null ? null : num(r.regularMarketChangePercent) / 100,
          marketCap: num(r.marketCap),
          peRatio: num(r.trailingPE),
          eps: num(r.epsTrailingTwelveMonths),
          dividendYield: num(r.trailingAnnualDividendYield),
          dividend: num(r.trailingAnnualDividendRate),
          week52High: num(r.fiftyTwoWeekHigh),
          week52Low: num(r.fiftyTwoWeekLow),
          volume: num(r.regularMarketVolume),
          avgVolume: num(r.averageDailyVolume3Month),
          bookValue: num(r.bookValue),
          priceToBook: num(r.priceToBook),
          currency: r.currency ?? null,
          asOf: new Date().toISOString(),
          provider: 'yahoo',
        }
      }
      return out
    },
    async history(symbol) {
      const j = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3y&interval=1d`)
      const res = j?.chart?.result?.[0]
      const ts = res?.timestamp
      const closes = res?.indicators?.quote?.[0]?.close
      if (!Array.isArray(ts) || !Array.isArray(closes)) return []
      return ts
        .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: num(closes[i]) }))
        .filter((d) => d.close !== null)
    },
  },
}

export const PROVIDERS = Object.values(adapters).map((a) => ({ id: a.id, label: a.label, needsKey: a.needsKey }))

export function activeProvider() {
  const id = (process.env.MARKET_DATA_PROVIDER || 'none').toLowerCase()
  if (id === 'none') return null
  return adapters[id] || null
}

export function providerStatus() {
  const id = (process.env.MARKET_DATA_PROVIDER || 'none').toLowerCase()
  const a = adapters[id]
  const key = process.env.MARKET_DATA_API_KEY || ''
  return {
    id,
    label: a?.label || 'Not configured',
    configured: Boolean(a) && (!a.needsKey || Boolean(key)),
    needsKey: a?.needsKey ?? null,
    hasKey: Boolean(key),
    cacheTtlMinutes: CACHE_TTL_MS / 60000,
    cached: cache.size,
    available: PROVIDERS,
  }
}

/**
 * Fetch quotes for symbols. Always resolves — never throws.
 * Returns { [symbol]: quote } with nulls for anything unavailable.
 */
export async function getQuotes(symbols = []) {
  const list = [...new Set(symbols.filter(Boolean).map((s) => String(s).trim()))]
  if (!list.length) return {}

  const provider = activeProvider()
  if (!provider) return Object.fromEntries(list.map((s) => [s, emptyQuote(s)]))

  const key = process.env.MARKET_DATA_API_KEY || ''
  if (provider.needsKey && !key) return Object.fromEntries(list.map((s) => [s, emptyQuote(s)]))

  const out = {}
  const misses = []
  for (const s of list) {
    const hit = cacheGet(`q:${provider.id}:${s}`)
    if (hit) out[s] = hit
    else misses.push(s)
  }
  if (!misses.length) return out

  try {
    const fresh = await provider.quotes(misses, key)
    for (const s of misses) {
      const q = fresh?.[s] || emptyQuote(s)
      cacheSet(`q:${provider.id}:${s}`, q)
      out[s] = q
    }
  } catch (e) {
    console.error('[market-data] provider error:', e?.message)
    for (const s of misses) out[s] = emptyQuote(s)
  }
  return out
}

/** Daily close history: [{date, close}]. Always resolves; [] on failure. */
export async function getHistory(symbol) {
  if (!symbol) return []
  const provider = activeProvider()
  if (!provider) return []
  const key = process.env.MARKET_DATA_API_KEY || ''
  if (provider.needsKey && !key) return []

  const ck = `h:${provider.id}:${symbol}`
  const hit = cacheGet(ck)
  if (hit) return hit
  try {
    const h = await provider.history(symbol, key)
    return cacheSet(ck, Array.isArray(h) ? h : [])
  } catch (e) {
    console.error('[market-data] history error:', e?.message)
    return []
  }
}

export function clearMarketCache() {
  const n = cache.size
  cache.clear()
  return n
}
