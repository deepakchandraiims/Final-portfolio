/**
 * Finance library test suite. Run: node scripts/test-finance.mjs
 * Values checked against hand-computed / textbook results.
 */
import * as F from '../lib/finance.js'

let pass = 0, fail = 0
const near = (a, b, tol = 1e-6) => a !== null && b !== null && Math.abs(a - b) < tol

function ok(name, cond, got, want) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      got:  ${got}\n      want: ${want}`) }
}

console.log('\n— descriptive —')
ok('mean([1,2,3,4]) = 2.5', near(F.mean([1, 2, 3, 4]), 2.5), F.mean([1, 2, 3, 4]), 2.5)
// sample stdev of [2,4,4,4,5,5,7,9] = 2.13809 (n-1)
ok('stdDev sample (n-1)', near(F.stdDev([2, 4, 4, 4, 5, 5, 7, 9]), 2.138089935, 1e-6), F.stdDev([2, 4, 4, 4, 5, 5, 7, 9]), 2.138089935)
ok('stdDev needs 2 pts -> null', F.stdDev([1]) === null, F.stdDev([1]), null)
ok('mean([]) -> null', F.mean([]) === null, F.mean([]), null)
// cov of x=[1,2,3], y=[2,4,7]: mx=2,my=4.333 -> ((-1)(-2.333)+(0)(-0.333)+(1)(2.667))/2 = 2.5
ok('covariance', near(F.covariance([1, 2, 3], [2, 4, 7]), 2.5, 1e-9), F.covariance([1, 2, 3], [2, 4, 7]), 2.5)
ok('correlation perfect = 1', near(F.correlation([1, 2, 3], [2, 4, 6]), 1, 1e-9), F.correlation([1, 2, 3], [2, 4, 6]), 1)
ok('correlation inverse = -1', near(F.correlation([1, 2, 3], [6, 4, 2]), -1, 1e-9), F.correlation([1, 2, 3], [6, 4, 2]), -1)

console.log('\n— returns —')
ok('toReturns([100,110,99])', JSON.stringify(F.toReturns([100, 110, 99]).map(x => +x.toFixed(4))) === JSON.stringify([0.1, -0.1]), F.toReturns([100, 110, 99]), '[0.1,-0.1]')
ok('totalReturn 100->150 = 0.5', near(F.totalReturn([100, 120, 150]), 0.5), F.totalReturn([100, 120, 150]), 0.5)
// CAGR: 100 -> 200 over 5y = 2^(1/5)-1 = 0.148698
ok('cagr 100->200/5y', near(F.cagr(100, 200, 5), 0.1486983550, 1e-8), F.cagr(100, 200, 5), 0.148698355)
ok('cagr guards years=0 -> null', F.cagr(100, 200, 0) === null, F.cagr(100, 200, 0), null)
ok('cagr guards begin<=0 -> null', F.cagr(0, 200, 5) === null, F.cagr(0, 200, 5), null)
// annualise monthly 1% -> 1.01^12-1 = 0.126825
ok('annualiseReturn 1%/mo', near(F.annualiseReturn(0.01, 12), 0.12682503, 1e-7), F.annualiseReturn(0.01, 12), 0.12682503)
// deannualise is the inverse
ok('deannualise inverts annualise', near(F.deannualise(F.annualiseReturn(0.01, 12), 12), 0.01, 1e-12), F.deannualise(F.annualiseReturn(0.01, 12), 12), 0.01)
ok('annualiseVol 2%/mo', near(F.annualiseVol(0.02, 12), 0.02 * Math.sqrt(12), 1e-12), F.annualiseVol(0.02, 12), 0.069282)

console.log('\n— drawdown —')
const dd = F.maxDrawdown([100, 120, 90, 110, 80, 130])
// peak 120 -> trough 80 = -33.33%
ok('maxDrawdown -33.33%', near(dd.maxDrawdown, -1 / 3, 1e-9), dd.maxDrawdown, -0.333333)
ok('maxDrawdown troughIndex = 4', dd.troughIndex === 4, dd.troughIndex, 4)
ok('monotonic rise -> 0 dd', near(F.maxDrawdown([1, 2, 3, 4]).maxDrawdown, 0), F.maxDrawdown([1, 2, 3, 4]).maxDrawdown, 0)
ok('equityCurve compounds', near(F.equityCurve([0.1, 0.1])[2], 1.21, 1e-12), F.equityCurve([0.1, 0.1])[2], 1.21)

console.log('\n— risk-adjusted —')
// Zero-vol series -> Sharpe must be null, NOT Infinity
ok('sharpe zero-vol -> null (not Inf)', F.sharpe([0.01, 0.01, 0.01], 0, 12) === null, F.sharpe([0.01, 0.01, 0.01], 0, 12), null)
// Sharpe sanity: positive mean, rf=0 -> positive
const shp = F.sharpe([0.02, -0.01, 0.03, 0.01, -0.005], 0, 12)
ok('sharpe positive for positive mean', shp > 0, shp, '>0')
// beta of series against itself = 1
const rs = [0.01, -0.02, 0.03, 0.005, -0.01]
ok('beta vs self = 1', near(F.beta(rs, rs), 1, 1e-9), F.beta(rs, rs), 1)
// beta of 2x-levered series = 2
ok('beta of 2x series = 2', near(F.beta(rs.map(r => r * 2), rs), 2, 1e-9), F.beta(rs.map(r => r * 2), rs), 2)
// alpha vs self should be ~0
ok('jensenAlpha vs self ~ 0', Math.abs(F.jensenAlpha(rs, rs, 0.0, 12)) < 1e-9, F.jensenAlpha(rs, rs, 0, 12), 0)
// tracking error vs self = 0
ok('trackingError vs self = 0', near(F.trackingError(rs, rs, 12), 0, 1e-12), F.trackingError(rs, rs, 12), 0)
// IR vs self -> null (zero active dispersion)
ok('informationRatio vs self -> null', F.informationRatio(rs, rs, 12) === null, F.informationRatio(rs, rs, 12), null)
// sortino >= sharpe when downside is smaller than total dispersion
const srt = F.sortino([0.02, -0.01, 0.03, 0.01, -0.005], 0, 12)
ok('sortino computes', srt !== null, srt, 'number')
ok('omega > 1 for net-positive series', F.omega([0.02, -0.01, 0.03]) > 1, F.omega([0.02, -0.01, 0.03]), '>1')

console.log('\n— tail risk —')
const tail = [-0.05, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05]
ok('VaR 90% is negative', F.valueAtRisk(tail, 0.9) < 0, F.valueAtRisk(tail, 0.9), '<0')
ok('ES <= VaR', F.expectedShortfall(tail, 0.9) <= F.valueAtRisk(tail, 0.9), F.expectedShortfall(tail, 0.9), '<= VaR')
ok('VaR too few pts -> null', F.valueAtRisk([0.1, 0.2], 0.95) === null, F.valueAtRisk([0.1, 0.2], 0.95), null)
ok('winRatio 0.6', near(F.winRatio([1, 1, 1, -1, -1]), 0.6), F.winRatio([1, 1, 1, -1, -1]), 0.6)

console.log('\n— Monte Carlo —')
const mc = F.monteCarlo({ initial: 1e7, years: 10, simulations: 2000, expectedReturn: 0.12, volatility: 0.18, seed: 7 })
ok('mc returns median', mc.median > 0, mc.median, '>0')
ok('mc worst < median < best', mc.worst < mc.median && mc.median < mc.best, `${mc.worst}<${mc.median}<${mc.best}`, 'ordered')
ok('mc bands length = years+1', mc.bands.length === 11, mc.bands.length, 11)
ok('mc band p05<median<p95', mc.bands[10].p05 < mc.bands[10].median && mc.bands[10].median < mc.bands[10].p95, 'ordered', 'ordered')
ok('mc histogram sums to sims', mc.histogram.reduce((s, b) => s + b.count, 0) === mc.simulations, mc.histogram.reduce((s, b) => s + b.count, 0), mc.simulations)
ok('mc probLoss in [0,1]', mc.probLoss >= 0 && mc.probLoss <= 1, mc.probLoss, '[0,1]')
// Reproducibility via seed
const mcA = F.monteCarlo({ initial: 1e6, years: 5, simulations: 300, seed: 99 })
const mcB = F.monteCarlo({ initial: 1e6, years: 5, simulations: 300, seed: 99 })
ok('mc seed reproducible', mcA.median === mcB.median, mcA.median, mcB.median)
// GBM median should track exp(mu*t) roughly (log-space drift correction)
const mc0 = F.monteCarlo({ initial: 100, years: 10, simulations: 8000, expectedReturn: 0.10, volatility: 0.0001, seed: 3 })
const expected = 100 * Math.exp(0.10 * 10)
ok('mc ~zero-vol median ≈ exp(mu*t)', Math.abs(mc0.median - expected) / expected < 0.01, mc0.median.toFixed(2), expected.toFixed(2))

console.log('\n— portfolio roll-up —')
const holdings = [
  { name: 'A', ticker: 'A', quantity: 100, entryPrice: 100, currentPrice: 120, sector: 'IT', assetClass: 'Indian Stocks', status: 'Holding' },
  { name: 'B', ticker: 'B', quantity: 50, entryPrice: 200, currentPrice: 180, sector: 'Banks', assetClass: 'Indian Stocks', status: 'Holding' },
  { name: 'C', ticker: 'C', quantity: 10, entryPrice: 50, currentPrice: 90, sector: 'IT', assetClass: 'ETFs', status: 'Watchlist' },
  { name: 'D', ticker: 'D', quantity: 10, entryPrice: 100, exitPrice: 150, sector: 'IT', assetClass: 'Indian Stocks', status: 'Exited' },
]
const s = F.portfolioSummary(holdings, { initialCapital: 100000, startDate: '2023-01-01' })
// invested = 100*100 + 50*200 = 20000 ; value = 12000 + 9000 = 21000
ok('invested = 20000', near(s.invested, 20000), s.invested, 20000)
ok('marketValue = 21000', near(s.marketValue, 21000), s.marketValue, 21000)
ok('unrealised = 1000', near(s.unrealised, 1000), s.unrealised, 1000)
ok('realised = 500 (D)', near(s.realised, 500), s.realised, 500)
ok('cash = 80000', near(s.cash, 80000), s.cash, 80000)
ok('totalValue = 101000', near(s.totalValue, 101000), s.totalValue, 101000)
ok('watchlist excluded from count', s.holdingsCount === 2, s.holdingsCount, 2)
ok('sectorCount = 2 (IT, Banks)', s.sectorCount === 2, s.sectorCount, 2)
ok('winRatio = 0.5', near(s.winRatio, 0.5), s.winRatio, 0.5)
const allocSum = s.assetAllocation.reduce((t, a) => t + a.weight, 0)
ok('assetAllocation weights sum to 1', near(allocSum, 1, 1e-9), allocSum, 1)

const w = F.holdingWeights(holdings)
ok('holdingWeights excludes watchlist/exited', w.length === 2, w.length, 2)
ok('weights sum to 1', near(w.reduce((t, x) => t + x.weight, 0), 1, 1e-9), w.reduce((t, x) => t + x.weight, 0), 1)
ok('A weight = 12000/21000', near(w[0].weight, 12000 / 21000, 1e-9), w[0].weight, 0.5714)

const contrib = F.contributionAnalysis(holdings)
// total cost 20000; A pnl +2000 -> +10%; B pnl -1000 -> -5%
ok('contribution A = +10%', near(contrib[0].contribution, 0.1, 1e-9), contrib[0].contribution, 0.1)
ok('contribution sums to book return', near(contrib.reduce((t, c) => t + c.contribution, 0), 0.05, 1e-9), contrib.reduce((t, c) => t + c.contribution, 0), 0.05)

console.log('\n— missing data must be N/A, never fabricated —')
ok('empty portfolio annualised -> null', F.portfolioSummary([], {}).annualisedReturn === null, F.portfolioSummary([], {}).annualisedReturn, null)
ok('riskPack with no data -> nulls', F.riskPack([], []).sharpe === null, F.riskPack([], []).sharpe, null)
const rp = F.riskPack([100, 102, 101, 105, 103, 108], [100, 101, 100, 103, 102, 105], { ppy: 252 })
ok('riskPack computes sharpe', rp.sharpe !== null, rp.sharpe, 'number')
ok('riskPack computes beta', rp.beta !== null, rp.beta, 'number')
ok('riskPack maxDrawdown < 0', rp.maxDrawdown < 0, rp.maxDrawdown, '<0')
ok('riskPack observations = 5', rp.observations === 5, rp.observations, 5)

console.log('\n— FX / multi-currency (regression: $ and ₹ must not sum 1:1) —')
const fxSettings = { initialCapital: 10000000, baseCurrency: 'INR', fxRates: { INR: 1, USD: 83.5 } }
const mixed = [
  { ticker: 'A.NS', quantity: 100, entryPrice: 1000, currentPrice: 1200, currency: 'INR', sector: 'IT', assetClass: 'Indian Stocks', status: 'Holding' },
  { ticker: 'MSFT', quantity: 90, entryPrice: 345, currentPrice: 421, currency: 'USD', sector: 'IT', assetClass: 'US Stocks', status: 'Holding' },
]
const fm = F.positionMetrics(mixed[1], 'INR', { USD: 83.5 })
ok('fxRate base = 1', F.fxRate('INR', 'INR', {}) === 1, F.fxRate('INR', 'INR', {}), 1)
ok('fxRate USD->INR = 83.5', F.fxRate('USD', 'INR', { USD: 83.5 }) === 83.5, F.fxRate('USD', 'INR', { USD: 83.5 }), 83.5)
ok('fxRate unknown -> null (not 1)', F.fxRate('JPY', 'INR', { USD: 83.5 }) === null, F.fxRate('JPY', 'INR', { USD: 83.5 }), null)
ok('USD position value converted', near(fm.value, 90 * 421 * 83.5, 1e-6), fm.value, 90 * 421 * 83.5)
ok('native value preserved', near(fm.valueNative, 90 * 421, 1e-9), fm.valueNative, 37890)
ok('returnPct is FX-independent', near(fm.returnPct, (421 - 345) / 345, 1e-9), fm.returnPct, 0.2203)
const fxs = F.portfolioSummary(mixed, fxSettings)
// INR leg 120000 + USD leg 37890*83.5 = 3,163,815 -> 3,283,815
ok('mixed-currency marketValue', near(fxs.marketValue, 120000 + 37890 * 83.5, 1e-6), fxs.marketValue, 3283815)
ok('no fxMissing when rates present', fxs.fxMissing.length === 0, fxs.fxMissing.length, 0)
// missing rate must be flagged, not silently 1:1
const noFx = F.portfolioSummary(mixed, { initialCapital: 1e7, baseCurrency: 'INR', fxRates: { INR: 1 } })
ok('missing FX rate is flagged', noFx.fxMissing.length === 1 && noFx.fxMissing[0].currency === 'USD', JSON.stringify(noFx.fxMissing), '[{USD}]')
ok('missing FX excluded, not summed 1:1', near(noFx.marketValue, 120000, 1e-9), noFx.marketValue, 120000)
ok('unconvertible position value -> null', F.positionMetrics(mixed[1], 'INR', {}).value === null, F.positionMetrics(mixed[1], 'INR', {}).value, null)
ok('weights FX-aware sum to 1', near(F.holdingWeights(mixed, fxSettings).reduce((t, x) => t + (x.weight || 0), 0), 1, 1e-9), 'sum', 1)
// realised P&L must also convert
const exitedUsd = [{ ticker: 'X', quantity: 10, entryPrice: 100, exitPrice: 150, currency: 'USD', status: 'Exited' }]
ok('realised P&L converted', near(F.portfolioSummary(exitedUsd, fxSettings).realised, 10 * 50 * 83.5, 1e-6), F.portfolioSummary(exitedUsd, fxSettings).realised, 41750)

console.log('\n— formatting —')
ok('fmtPct null -> N/A', F.fmtPct(null) === 'N/A', F.fmtPct(null), 'N/A')
ok('fmtPct(0.1234)', F.fmtPct(0.1234) === '12.34%', F.fmtPct(0.1234), '12.34%')
ok('fmtSignedPct positive', F.fmtSignedPct(0.05) === '+5.00%', F.fmtSignedPct(0.05), '+5.00%')
ok('fmtMoney INR crore', F.fmtMoney(12500000, 'INR') === '₹1.25 Cr', F.fmtMoney(12500000, 'INR'), '₹1.25 Cr')
ok('fmtMoney INR lakh', F.fmtMoney(250000, 'INR') === '₹2.50 L', F.fmtMoney(250000, 'INR'), '₹2.50 L')
ok('fmtMoney USD M', F.fmtMoney(2500000, 'USD') === '$2.50M', F.fmtMoney(2500000, 'USD'), '$2.50M')
ok('fmtMoney null -> N/A', F.fmtMoney(null) === 'N/A', F.fmtMoney(null), 'N/A')
ok('fmtX', F.fmtX(2.5) === '2.50x', F.fmtX(2.5), '2.50x')

console.log(`\n${'='.repeat(46)}`)
console.log(`  PASS ${pass}   FAIL ${fail}`)
console.log('='.repeat(46))
process.exit(fail > 0 ? 1 : 0)
