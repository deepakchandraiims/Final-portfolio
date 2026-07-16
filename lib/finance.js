/**
 * Portfolio analytics — pure functions, no I/O, no framework.
 *
 * Conventions:
 *  - Returns are decimals (0.12 = 12%), never percentages, until formatting.
 *  - `rf` (risk-free) and `mar` are ANNUAL decimals; they are de-annualised
 *    internally to the series' periodicity.
 *  - Every function returns `null` rather than NaN/0 when the input is
 *    insufficient. A null must surface as "N/A" in the UI — never as a zero,
 *    because a fabricated 0.00 Sharpe is worse than an honest blank.
 */

export const PERIODS = { daily: 252, weekly: 52, monthly: 12, quarterly: 4, annual: 1 }

const isNum = (x) => typeof x === 'number' && Number.isFinite(x)
const clean = (xs) => (Array.isArray(xs) ? xs.filter(isNum) : [])

/* ------------------------------ descriptive ------------------------------ */

export function mean(xs) {
  const a = clean(xs)
  if (!a.length) return null
  return a.reduce((s, x) => s + x, 0) / a.length
}

/** Sample standard deviation (n-1). Needs >= 2 points. */
export function stdDev(xs) {
  const a = clean(xs)
  if (a.length < 2) return null
  const m = mean(a)
  const v = a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)
  return Math.sqrt(v)
}

/** Downside deviation vs a Minimum Acceptable Return (periodic). */
export function downsideDeviation(xs, marPeriodic = 0) {
  const a = clean(xs)
  if (a.length < 2) return null
  const below = a.map((x) => Math.min(0, x - marPeriodic) ** 2)
  return Math.sqrt(below.reduce((s, x) => s + x, 0) / (a.length - 1))
}

export function covariance(xs, ys) {
  const a = clean(xs), b = clean(ys)
  const n = Math.min(a.length, b.length)
  if (n < 2) return null
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n))
  let s = 0
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb)
  return s / (n - 1)
}

export function correlation(xs, ys) {
  const cov = covariance(xs, ys)
  const sa = stdDev(xs), sb = stdDev(ys)
  if (cov === null || !sa || !sb) return null
  return cov / (sa * sb)
}

/* ------------------------------ returns ------------------------------ */

/** Simple period-over-period returns from a price/value series. */
export function toReturns(series) {
  const a = clean(series)
  if (a.length < 2) return []
  const out = []
  for (let i = 1; i < a.length; i++) {
    if (a[i - 1] === 0) continue
    out.push(a[i] / a[i - 1] - 1)
  }
  return out
}

/** Total (cumulative) return from first to last value. */
export function totalReturn(series) {
  const a = clean(series)
  if (a.length < 2 || a[0] === 0) return null
  return a[a.length - 1] / a[0] - 1
}

/** Compound the periodic returns. */
export function cumulativeFromReturns(rs) {
  const a = clean(rs)
  if (!a.length) return null
  return a.reduce((acc, r) => acc * (1 + r), 1) - 1
}

/** CAGR from begin/end values across `years`. */
export function cagr(beginValue, endValue, years) {
  if (!isNum(beginValue) || !isNum(endValue) || !isNum(years)) return null
  if (beginValue <= 0 || years <= 0) return null
  if (endValue <= 0) return -1
  return (endValue / beginValue) ** (1 / years) - 1
}

/** Annualise a periodic mean return. */
export function annualiseReturn(meanPeriodic, periodsPerYear) {
  if (!isNum(meanPeriodic) || !isNum(periodsPerYear)) return null
  return (1 + meanPeriodic) ** periodsPerYear - 1
}

/** Annualise a periodic volatility (sqrt-of-time rule). */
export function annualiseVol(volPeriodic, periodsPerYear) {
  if (!isNum(volPeriodic) || !isNum(periodsPerYear)) return null
  return volPeriodic * Math.sqrt(periodsPerYear)
}

/** Convert an annual rate to the equivalent periodic rate. */
export function deannualise(annualRate, periodsPerYear) {
  if (!isNum(annualRate) || !isNum(periodsPerYear) || periodsPerYear <= 0) return null
  return (1 + annualRate) ** (1 / periodsPerYear) - 1
}

/* ------------------------------ risk-adjusted ------------------------------ */

/** Sharpe = (annualised excess return) / (annualised vol). */
export function sharpe(returns, rfAnnual = 0, ppy = PERIODS.daily) {
  const rs = clean(returns)
  if (rs.length < 2) return null
  const rfP = deannualise(rfAnnual, ppy) ?? 0
  const excess = rs.map((r) => r - rfP)
  const m = mean(excess), sd = stdDev(excess)
  if (m === null || !sd) return null
  return (m / sd) * Math.sqrt(ppy)
}

/** Sortino — penalises only downside dispersion. */
export function sortino(returns, marAnnual = 0, ppy = PERIODS.daily) {
  const rs = clean(returns)
  if (rs.length < 2) return null
  const marP = deannualise(marAnnual, ppy) ?? 0
  const m = mean(rs.map((r) => r - marP))
  const dd = downsideDeviation(rs, marP)
  if (m === null || !dd) return null
  return (m / dd) * Math.sqrt(ppy)
}

/** Beta vs benchmark. */
export function beta(portfolioReturns, benchmarkReturns) {
  const cov = covariance(portfolioReturns, benchmarkReturns)
  const varB = stdDev(benchmarkReturns)
  if (cov === null || !varB) return null
  return cov / varB ** 2
}

/** Jensen's alpha (annualised): Rp - [Rf + B(Rm - Rf)]. */
export function jensenAlpha(portfolioReturns, benchmarkReturns, rfAnnual = 0, ppy = PERIODS.daily) {
  const b = beta(portfolioReturns, benchmarkReturns)
  const mp = mean(portfolioReturns), mb = mean(benchmarkReturns)
  if (b === null || mp === null || mb === null) return null
  const rp = annualiseReturn(mp, ppy)
  const rm = annualiseReturn(mb, ppy)
  if (rp === null || rm === null) return null
  return rp - (rfAnnual + b * (rm - rfAnnual))
}

/** Treynor = excess return per unit of systematic risk. */
export function treynor(portfolioReturns, benchmarkReturns, rfAnnual = 0, ppy = PERIODS.daily) {
  const b = beta(portfolioReturns, benchmarkReturns)
  const mp = mean(portfolioReturns)
  if (b === null || b === 0 || mp === null) return null
  const rp = annualiseReturn(mp, ppy)
  if (rp === null) return null
  return (rp - rfAnnual) / b
}

/** Tracking error — annualised stdev of active return. */
export function trackingError(portfolioReturns, benchmarkReturns, ppy = PERIODS.daily) {
  const a = clean(portfolioReturns), b = clean(benchmarkReturns)
  const n = Math.min(a.length, b.length)
  if (n < 2) return null
  const active = []
  for (let i = 0; i < n; i++) active.push(a[i] - b[i])
  const sd = stdDev(active)
  return sd === null ? null : annualiseVol(sd, ppy)
}

/** Information ratio = annualised active return / tracking error. */
export function informationRatio(portfolioReturns, benchmarkReturns, ppy = PERIODS.daily) {
  const a = clean(portfolioReturns), b = clean(benchmarkReturns)
  const n = Math.min(a.length, b.length)
  if (n < 2) return null
  const active = []
  for (let i = 0; i < n; i++) active.push(a[i] - b[i])
  const m = mean(active), sd = stdDev(active)
  if (m === null || !sd) return null
  return (m / sd) * Math.sqrt(ppy)
}

/** Calmar = annualised return / |max drawdown|. */
export function calmar(returns, ppy = PERIODS.daily) {
  const m = mean(returns)
  if (m === null) return null
  const ann = annualiseReturn(m, ppy)
  const dd = maxDrawdown(equityCurve(returns))
  if (ann === null || !dd || !dd.maxDrawdown) return null
  return ann / Math.abs(dd.maxDrawdown)
}

/** Omega — probability-weighted gains over losses vs a threshold. */
export function omega(returns, thresholdPeriodic = 0) {
  const rs = clean(returns)
  if (rs.length < 2) return null
  let gain = 0, loss = 0
  for (const r of rs) {
    const d = r - thresholdPeriodic
    if (d > 0) gain += d
    else loss -= d
  }
  if (loss === 0) return null
  return gain / loss
}

/* ------------------------------ drawdown ------------------------------ */

/** Growth-of-1 curve from periodic returns. */
export function equityCurve(returns, start = 1) {
  const rs = clean(returns)
  const out = [start]
  for (const r of rs) out.push(out[out.length - 1] * (1 + r))
  return out
}

/**
 * Max drawdown over a value series.
 * Returns { maxDrawdown (negative decimal), peakIndex, troughIndex, series }.
 */
export function maxDrawdown(series) {
  const a = clean(series)
  if (a.length < 2) return null
  let peak = a[0], peakIdx = 0, maxDD = 0, ddPeak = 0, ddTrough = 0
  const dd = []
  for (let i = 0; i < a.length; i++) {
    if (a[i] > peak) { peak = a[i]; peakIdx = i }
    const d = peak === 0 ? 0 : a[i] / peak - 1
    dd.push(d)
    if (d < maxDD) { maxDD = d; ddPeak = peakIdx; ddTrough = i }
  }
  return { maxDrawdown: maxDD, peakIndex: ddPeak, troughIndex: ddTrough, series: dd }
}

/* ------------------------------ tail risk ------------------------------ */

/** Historical VaR at `conf` (0.95 -> 95%). Returned as a negative decimal. */
export function valueAtRisk(returns, conf = 0.95) {
  const a = clean(returns).slice().sort((x, y) => x - y)
  if (a.length < 5) return null
  const idx = Math.floor((1 - conf) * a.length)
  return a[Math.min(idx, a.length - 1)]
}

/** Expected Shortfall (CVaR) — mean of losses beyond VaR. */
export function expectedShortfall(returns, conf = 0.95) {
  const a = clean(returns).slice().sort((x, y) => x - y)
  if (a.length < 5) return null
  const cut = Math.max(1, Math.floor((1 - conf) * a.length))
  const tail = a.slice(0, cut)
  return mean(tail)
}

/* ------------------------------ hit stats ------------------------------ */

export function winRatio(returns) {
  const a = clean(returns)
  if (!a.length) return null
  return a.filter((r) => r > 0).length / a.length
}

/* ------------------------------ Monte Carlo ------------------------------ */

/** Mulberry32 — small, fast, seedable PRNG so simulations are reproducible. */
export function makeRng(seed = 42) {
  let t = seed >>> 0
  return function rng() {
    t += 0x6D2B79F5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** Box–Muller standard normal. */
function gauss(rng) {
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function percentile(sortedAsc, p) {
  const a = sortedAsc
  if (!a.length) return null
  const idx = (a.length - 1) * p
  const lo = Math.floor(idx), hi = Math.ceil(idx)
  if (lo === hi) return a[lo]
  return a[lo] + (a[hi] - a[lo]) * (idx - lo)
}

/**
 * Geometric Brownian Motion Monte Carlo.
 * Uses log-space drift (mu - s^2/2) so the median path is not biased upward —
 * the common naive implementation overstates outcomes.
 */
export function monteCarlo({
  initial = 1_000_000,
  years = 10,
  simulations = 1000,
  expectedReturn = 0.12,
  volatility = 0.18,
  stepsPerYear = 12,
  seed = 42,
  confidence = 0.9,
} = {}) {
  if (!isNum(initial) || initial <= 0) return null
  const sims = Math.max(50, Math.min(20000, Math.floor(simulations)))
  const steps = Math.max(1, Math.floor(years * stepsPerYear))
  const dt = 1 / stepsPerYear
  const rng = makeRng(seed)
  const drift = (expectedReturn - (volatility ** 2) / 2) * dt
  const diff = volatility * Math.sqrt(dt)

  const finals = new Array(sims)
  // Percentile bands over time, sampled yearly to keep the payload small.
  const sampleEvery = stepsPerYear
  const bandSteps = Math.floor(steps / sampleEvery) + 1
  const paths = Array.from({ length: bandSteps }, () => new Array(sims))

  for (let s = 0; s < sims; s++) {
    let v = initial
    paths[0][s] = v
    let band = 1
    for (let t = 1; t <= steps; t++) {
      v *= Math.exp(drift + diff * gauss(rng))
      if (t % sampleEvery === 0 && band < bandSteps) paths[band++][s] = v
    }
    finals[s] = v
  }

  const sortedFinals = finals.slice().sort((a, b) => a - b)
  const lo = (1 - confidence) / 2
  const hi = 1 - lo

  const bands = paths.map((row, i) => {
    const sorted = row.filter(isNum).sort((a, b) => a - b)
    return {
      year: i,
      p05: percentile(sorted, lo),
      p25: percentile(sorted, 0.25),
      median: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      p95: percentile(sorted, hi),
    }
  })

  // Histogram of terminal values
  const bins = 24
  const min = sortedFinals[0], max = sortedFinals[sortedFinals.length - 1]
  const width = (max - min) / bins || 1
  const hist = Array.from({ length: bins }, (_, i) => ({
    x0: min + i * width, x1: min + (i + 1) * width, count: 0,
  }))
  for (const f of sortedFinals) {
    const i = Math.min(bins - 1, Math.floor((f - min) / width))
    hist[i].count++
  }

  return {
    simulations: sims,
    years,
    initial,
    median: percentile(sortedFinals, 0.5),
    best: percentile(sortedFinals, hi),
    worst: percentile(sortedFinals, lo),
    p25: percentile(sortedFinals, 0.25),
    p75: percentile(sortedFinals, 0.75),
    probLoss: sortedFinals.filter((v) => v < initial).length / sims,
    bands,
    histogram: hist,
  }
}

/* ------------------------------ portfolio roll-up ------------------------------ */

const num = (x, d = 0) => (isNum(Number(x)) ? Number(x) : d)

/**
 * FX rate to convert a holding's currency into the portfolio base currency.
 * `rates` maps CURRENCY -> units of base per 1 unit of that currency,
 * e.g. base INR, { USD: 83.5 } means $1 = ₹83.5.
 * Returns 1 for the base currency. Unknown currency -> null (caller must
 * treat the position as unconvertible rather than silently 1:1).
 */
export function fxRate(currency, baseCurrency = 'INR', rates = {}) {
  if (!currency || currency === baseCurrency) return 1
  const r = Number(rates?.[currency])
  return Number.isFinite(r) && r > 0 ? r : null
}

/**
 * Market value / cost / P&L for one holding, expressed in BASE currency.
 *
 * Currency correctness matters: a book holding both NSE and NASDAQ names must
 * convert before aggregation. Summing $ and ₹ at 1:1 silently understates the
 * US sleeve by ~83x. If the rate is missing we surface `fxMissing` and return
 * null values rather than guessing.
 */
export function positionMetrics(h, baseCurrency = 'INR', rates = {}) {
  const qty = num(h.quantity)
  const entry = num(h.entryPrice ?? h.averageCost)
  const price = isNum(Number(h.currentPrice)) ? Number(h.currentPrice) : entry
  const cur = h.currency || baseCurrency
  const fx = fxRate(cur, baseCurrency, rates)

  // Native-currency figures (what the position's own statement would show)
  const costNative = qty * entry
  const valueNative = qty * price
  const pnlNative = valueNative - costNative

  if (fx === null) {
    return {
      cost: null, value: null, pnl: null,
      returnPct: costNative > 0 ? pnlNative / costNative : null,
      costNative, valueNative, pnlNative,
      price, currency: cur, fx: null, fxMissing: true,
      isLive: isNum(Number(h.currentPrice)),
    }
  }

  return {
    cost: costNative * fx,
    value: valueNative * fx,
    pnl: pnlNative * fx,
    // Return % is FX-independent when measured in native terms.
    returnPct: costNative > 0 ? pnlNative / costNative : null,
    costNative, valueNative, pnlNative,
    price, currency: cur, fx, fxMissing: false,
    isLive: isNum(Number(h.currentPrice)),
  }
}

/**
 * Roll holdings + settings into portfolio-level figures.
 * Only `Holding` status contributes to market value; `Exited`/`Closed`
 * contribute realised P&L; `Watchlist` contributes nothing.
 */
export function portfolioSummary(holdings = [], settings = {}) {
  const base = settings.baseCurrency || 'INR'
  const rates = settings.fxRates || {}
  const active = holdings.filter((h) => h.enabled !== false && (h.status || 'Holding') === 'Holding')
  const exited = holdings.filter((h) => ['Exited', 'Closed'].includes(h.status))

  let invested = 0, marketValue = 0
  const bySector = new Map()
  const byAsset = new Map()
  const fxMissing = []

  for (const h of active) {
    const m = positionMetrics(h, base, rates)
    if (m.fxMissing) { fxMissing.push({ ticker: h.ticker, currency: m.currency }); continue }
    invested += m.cost
    marketValue += m.value
    const sec = h.sector || 'Unclassified'
    const cls = h.assetClass || 'Unclassified'
    bySector.set(sec, (bySector.get(sec) || 0) + m.value)
    byAsset.set(cls, (byAsset.get(cls) || 0) + m.value)
  }

  let realised = 0
  for (const h of exited) {
    const qty = num(h.quantity)
    const entry = num(h.entryPrice ?? h.averageCost)
    const exit = num(h.exitPrice ?? h.currentPrice ?? entry)
    const fx = fxRate(h.currency || base, base, rates)
    if (fx === null) { fxMissing.push({ ticker: h.ticker, currency: h.currency }); continue }
    realised += qty * (exit - entry) * fx
  }

  const initialCapital = num(settings.initialCapital, invested)
  const cash = Math.max(0, initialCapital - invested)
  const totalValue = marketValue + cash
  const unrealised = marketValue - invested

  const start = settings.startDate ? new Date(settings.startDate) : null
  const years = start && !Number.isNaN(start.getTime())
    ? Math.max(0.01, (Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const absoluteReturn = initialCapital > 0 ? (totalValue - initialCapital) / initialCapital : null
  const annualised = years && initialCapital > 0 ? cagr(initialCapital, totalValue, years) : null

  const pct = (m) => {
    const t = [...m.values()].reduce((s, v) => s + v, 0)
    return [...m.entries()]
      .map(([k, v]) => ({ label: k, value: v, weight: t > 0 ? v / t : 0 }))
      .sort((a, b) => b.value - a.value)
  }

  const alloc = pct(byAsset)
  if (cash > 0) {
    const t = totalValue || 1
    alloc.push({ label: 'Cash', value: cash, weight: cash / t })
    for (const a of alloc) a.weight = a.value / t
  }

  const winners = active.filter((h) => (positionMetrics(h, base, rates).pnl || 0) > 0).length

  return {
    baseCurrency: base,
    fxMissing,
    initialCapital,
    invested,
    cash,
    marketValue,
    totalValue,
    unrealised,
    realised,
    absoluteReturn,
    annualisedReturn: annualised,
    years,
    holdingsCount: active.length,
    exitedCount: exited.length,
    sectorCount: bySector.size,
    cashWeight: totalValue > 0 ? cash / totalValue : null,
    winRatio: active.length ? winners / active.length : null,
    sectorAllocation: pct(bySector),
    assetAllocation: alloc,
    livePrices: active.filter((h) => positionMetrics(h, base, rates).isLive).length,
  }
}

/** Weight each holding within the invested book. */
export function holdingWeights(holdings = [], settings = {}) {
  const base = settings.baseCurrency || 'INR'
  const rates = settings.fxRates || {}
  const active = holdings.filter((h) => h.enabled !== false && (h.status || 'Holding') === 'Holding')
  const total = active.reduce((s, h) => s + (positionMetrics(h, base, rates).value || 0), 0)
  return active.map((h) => {
    const m = positionMetrics(h, base, rates)
    return { ...h, ...m, weight: total > 0 && m.value !== null ? m.value / total : null }
  })
}

/**
 * Contribution to return: weight-at-cost x position return.
 * Sums to the book's money-weighted return, which is the point of the metric.
 */
export function contributionAnalysis(holdings = [], settings = {}) {
  const base = settings.baseCurrency || 'INR'
  const rates = settings.fxRates || {}
  const active = holdings.filter((h) => h.enabled !== false && (h.status || 'Holding') === 'Holding')
  const totalCost = active.reduce((s, h) => s + (positionMetrics(h, base, rates).cost || 0), 0)
  if (totalCost <= 0) return []
  return active
    .map((h) => {
      const m = positionMetrics(h, base, rates)
      return {
        name: h.name || h.ticker,
        ticker: h.ticker,
        sector: h.sector || 'Unclassified',
        contribution: m.pnl === null ? null : m.pnl / totalCost,
        pnl: m.pnl,
        returnPct: m.returnPct,
      }
    })
    .sort((a, b) => b.contribution - a.contribution)
}

/** Full risk pack from a portfolio series and benchmark series. */
export function riskPack(portfolioSeries = [], benchmarkSeries = [], opts = {}) {
  const { rf = 0.07, ppy = PERIODS.daily, conf = 0.95 } = opts
  const pr = toReturns(portfolioSeries)
  const br = toReturns(benchmarkSeries)
  const dd = maxDrawdown(portfolioSeries)
  const m = mean(pr)
  const sd = stdDev(pr)

  return {
    annualisedReturn: m === null ? null : annualiseReturn(m, ppy),
    volatility: sd === null ? null : annualiseVol(sd, ppy),
    downsideDeviation: (() => {
      const d = downsideDeviation(pr, deannualise(rf, ppy) ?? 0)
      return d === null ? null : annualiseVol(d, ppy)
    })(),
    sharpe: sharpe(pr, rf, ppy),
    sortino: sortino(pr, rf, ppy),
    beta: br.length ? beta(pr, br) : null,
    alpha: br.length ? jensenAlpha(pr, br, rf, ppy) : null,
    treynor: br.length ? treynor(pr, br, rf, ppy) : null,
    informationRatio: br.length ? informationRatio(pr, br, ppy) : null,
    trackingError: br.length ? trackingError(pr, br, ppy) : null,
    calmar: calmar(pr, ppy),
    omega: omega(pr, deannualise(rf, ppy) ?? 0),
    maxDrawdown: dd ? dd.maxDrawdown : null,
    var95: valueAtRisk(pr, conf),
    expectedShortfall: expectedShortfall(pr, conf),
    winRatio: winRatio(pr),
    benchmarkReturn: br.length ? annualiseReturn(mean(br), ppy) : null,
    correlation: br.length ? correlation(pr, br) : null,
    observations: pr.length,
  }
}

/* ------------------------------ formatting ------------------------------ */

export const NA = 'N/A'

export function fmtPct(x, dp = 2) {
  if (!isNum(x)) return NA
  return `${(x * 100).toFixed(dp)}%`
}

export function fmtSignedPct(x, dp = 2) {
  if (!isNum(x)) return NA
  const s = (x * 100).toFixed(dp)
  return `${x > 0 ? '+' : ''}${s}%`
}

export function fmtNum(x, dp = 2) {
  if (!isNum(x)) return NA
  return x.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

const SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', SGD: 'S$' }

/** Indian-notation money (lakh/crore) for INR, compact notation otherwise. */
export function fmtMoney(x, currency = 'INR', { compact = true } = {}) {
  if (!isNum(x)) return NA
  const sym = SYMBOL[currency] || ''
  const abs = Math.abs(x)
  const sign = x < 0 ? '-' : ''
  if (!compact) {
    return `${sign}${sym}${abs.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 0 })}`
  }
  if (currency === 'INR') {
    if (abs >= 1e7) return `${sign}${sym}${(abs / 1e7).toFixed(2)} Cr`
    if (abs >= 1e5) return `${sign}${sym}${(abs / 1e5).toFixed(2)} L`
    return `${sign}${sym}${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }
  if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}${sym}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${sym}${abs.toFixed(0)}`
}

export function fmtX(x, dp = 2) {
  if (!isNum(x)) return NA
  return `${x.toFixed(dp)}x`
}
