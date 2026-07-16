'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileText, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Panel, SectionHead, Chip } from '@/components/shared/layout'
import { Metric } from '@/components/lab/lab-sections'
import * as F from '@/lib/finance'

const tone = (x) => (x === null || x === undefined ? 'text-neutral-500' : x > 0 ? 'text-terminal' : x < 0 ? 'text-red-400' : 'text-neutral-300')

/**
 * Portfolio and benchmark daily series.
 *
 * IMPORTANT: with no `lab_valuations` history recorded yet, there is no honest
 * way to compute Sharpe/beta/drawdown — those need a time series, not a
 * snapshot. Rather than fabricate a series (which would produce confident,
 * meaningless numbers), we return null and the UI states plainly that history
 * is being accumulated.
 */
function useSeries() {
  const { lab } = useSite()
  return useMemo(() => {
    const v = lab?.valuations
    if (!Array.isArray(v) || v.length < 30) return { portfolio: null, benchmark: null, count: v?.length || 0 }
    return {
      portfolio: v.map((r) => Number(r.total_value ?? r.totalValue)).filter(Number.isFinite),
      benchmark: v.map((r) => Number(r.benchmark)).filter(Number.isFinite),
      count: v.length,
    }
  }, [lab])
}

/* ---------------------------------- Risk ---------------------------------- */

const RISK_ROWS = [
  ['sharpe', 'Sharpe Ratio', 'Excess return per unit of total volatility', (v) => F.fmtNum(v, 2)],
  ['sortino', 'Sortino Ratio', 'Excess return per unit of downside volatility', (v) => F.fmtNum(v, 2)],
  ['beta', 'Beta', 'Sensitivity to the benchmark', (v) => F.fmtNum(v, 2)],
  ['alpha', 'Jensen Alpha', 'Return above what beta alone would predict', (v) => F.fmtSignedPct(v)],
  ['treynor', 'Treynor Ratio', 'Excess return per unit of systematic risk', (v) => F.fmtNum(v, 3)],
  ['informationRatio', 'Information Ratio', 'Active return per unit of tracking error', (v) => F.fmtNum(v, 2)],
  ['trackingError', 'Tracking Error', 'Annualised stdev of active return', (v) => F.fmtPct(v)],
  ['volatility', 'Volatility', 'Annualised standard deviation', (v) => F.fmtPct(v)],
  ['downsideDeviation', 'Downside Deviation', 'Volatility of returns below the risk-free rate', (v) => F.fmtPct(v)],
  ['maxDrawdown', 'Maximum Drawdown', 'Worst peak-to-trough decline', (v) => F.fmtPct(v)],
  ['calmar', 'Calmar Ratio', 'Annualised return over max drawdown', (v) => F.fmtNum(v, 2)],
  ['omega', 'Omega Ratio', 'Probability-weighted gains over losses', (v) => F.fmtNum(v, 2)],
  ['var95', 'Value at Risk (95%)', 'Daily loss not exceeded 95% of the time', (v) => F.fmtPct(v)],
  ['expectedShortfall', 'Expected Shortfall', 'Average loss in the worst 5% of days', (v) => F.fmtPct(v)],
  ['correlation', 'Correlation to Benchmark', 'Co-movement with the index', (v) => F.fmtNum(v, 2)],
]

export function LabRisk() {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const { portfolio, benchmark, count } = useSeries()

  const pack = useMemo(() => {
    if (!portfolio) return null
    return F.riskPack(portfolio, benchmark || [], { rf: settings.riskFreeRate ?? 0.07, ppy: F.PERIODS.daily })
  }, [portfolio, benchmark, settings])

  return (
    <div className="space-y-4">
      <SectionHead label="Risk Metrics" />

      {!pack && (
        <Panel className="p-5">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-gold/70 mt-0.5 shrink-0" />
            <div>
              <div className="text-[13px] text-neutral-200">Not enough history yet — {count} of 30 daily snapshots</div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-neutral-500 max-w-2xl">
                Sharpe, beta, drawdown and VaR are properties of a return <em>series</em>, not of a
                snapshot. With one valuation point there is no honest way to compute them, so this page
                stays blank rather than printing a confident number derived from nothing.
                Once <span className="font-mono text-neutral-400">lab_valuations</span> accumulates 30 daily
                rows, every metric below populates automatically.
              </p>
              <p className="mt-2.5 text-[11px] text-neutral-600">
                Snapshots are written by <span className="font-mono">POST /api/lab/snapshot</span> — schedule it daily via Vercel Cron.
              </p>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Panel className="divide-y divide-white/[0.05]">
          {RISK_ROWS.slice(0, 8).map(([k, label, hint, fmt]) => (
            <div key={k} className="px-4 py-2.5 flex items-center justify-between gap-3 group hover:bg-white/[0.015] transition" title={hint}>
              <div className="min-w-0">
                <div className="text-[11.5px] text-neutral-300">{label}</div>
                <div className="text-[9.5px] text-neutral-700 truncate">{hint}</div>
              </div>
              <div className={`text-[12px] font-mono tnum shrink-0 ${pack ? tone(pack[k]) : 'text-neutral-600'}`}>
                {pack ? fmt(pack[k]) : 'N/A'}
              </div>
            </div>
          ))}
        </Panel>
        <Panel className="divide-y divide-white/[0.05]">
          {RISK_ROWS.slice(8).map(([k, label, hint, fmt]) => (
            <div key={k} className="px-4 py-2.5 flex items-center justify-between gap-3 group hover:bg-white/[0.015] transition" title={hint}>
              <div className="min-w-0">
                <div className="text-[11.5px] text-neutral-300">{label}</div>
                <div className="text-[9.5px] text-neutral-700 truncate">{hint}</div>
              </div>
              <div className={`text-[12px] font-mono tnum shrink-0 ${pack ? tone(pack[k]) : 'text-neutral-600'}`}>
                {pack ? fmt(pack[k]) : 'N/A'}
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <p className="text-[10px] text-neutral-700">
        Risk-free rate {F.fmtPct(settings.riskFreeRate)} (10Y GSec) · daily periodicity · {pack ? `${pack.observations} observations` : 'awaiting history'}
      </p>
    </div>
  )
}

/* ------------------------------- Monte Carlo ------------------------------- */

export function LabMonteCarlo() {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const holdings = lab?.holdings || []
  const cur = settings.baseCurrency || 'INR'
  const summary = useMemo(() => F.portfolioSummary(holdings, settings), [holdings, settings])

  const [years, setYears] = useState(10)
  const [sims, setSims] = useState(1000)
  const [conf, setConf] = useState(0.9)
  const [er, setEr] = useState(0.12)
  const [vol, setVol] = useState(0.18)

  const mc = useMemo(() => F.monteCarlo({
    initial: summary.totalValue || settings.initialCapital,
    years, simulations: sims, expectedReturn: er, volatility: vol, confidence: conf, seed: 42,
  }), [summary.totalValue, settings.initialCapital, years, sims, er, vol, conf])

  const money = (x) => F.fmtMoney(x, cur)

  const chart = useMemo(() => {
    if (!mc) return null
    const W = 700, H = 220, pad = 8
    const maxV = Math.max(...mc.bands.map((b) => b.p95))
    const minV = Math.min(...mc.bands.map((b) => b.p05))
    const x = (i) => pad + (i / (mc.bands.length - 1)) * (W - pad * 2)
    const y = (v) => H - pad - ((v - minV) / (maxV - minV || 1)) * (H - pad * 2)
    const area = (lo, hi) =>
      `M ${mc.bands.map((b, i) => `${x(i)},${y(b[hi])}`).join(' L ')} L ${[...mc.bands].reverse().map((b, i) => `${x(mc.bands.length - 1 - i)},${y(b[lo])}`).join(' L ')} Z`
    const line = (k) => `M ${mc.bands.map((b, i) => `${x(i)},${y(b[k])}`).join(' L ')}`
    return { W, H, area, line, maxV, minV }
  }, [mc])

  const Slider = ({ label, value, onChange, min, max, step, fmt }) => (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="uppercase tracking-[0.14em] text-neutral-600">{label}</span>
        <span className="font-mono text-gold tnum">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full h-1 rounded-full appearance-none bg-white/10 accent-gold cursor-pointer focus-ring" />
    </div>
  )

  return (
    <div className="space-y-4">
      <SectionHead label="Monte Carlo Simulation" />
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <Panel className="p-4 space-y-4 h-fit">
          <Slider label="Years" value={years} onChange={setYears} min={1} max={30} step={1} fmt={(v) => `${v}y`} />
          <Slider label="Simulations" value={sims} onChange={setSims} min={200} max={5000} step={100} fmt={(v) => v.toLocaleString()} />
          <Slider label="Confidence" value={conf} onChange={setConf} min={0.5} max={0.99} step={0.01} fmt={(v) => `${(v * 100).toFixed(0)}%`} />
          <Slider label="Expected return" value={er} onChange={setEr} min={0} max={0.3} step={0.005} fmt={(v) => F.fmtPct(v, 1)} />
          <Slider label="Volatility" value={vol} onChange={setVol} min={0.02} max={0.5} step={0.005} fmt={(v) => F.fmtPct(v, 1)} />
          <div className="pt-3 border-t border-white/[0.06] text-[9.5px] text-neutral-700 leading-relaxed">
            Geometric Brownian Motion with log-space drift correction, seeded for reproducibility.
            Assumes constant μ and σ and normal log-returns — real markets have fat tails, so treat
            the bands as a framework, not a forecast.
          </div>
        </Panel>

        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Metric label={`Worst (${((1 - conf) / 2 * 100).toFixed(0)}th pct)`} value={money(mc?.worst)} />
            <Metric label="Median" value={money(mc?.median)} />
            <Metric label={`Best (${(100 - (1 - conf) / 2 * 100).toFixed(0)}th pct)`} value={money(mc?.best)} />
            <Metric label="Probability of loss" value={F.fmtPct(mc?.probLoss, 1)} subTone={tone(mc?.probLoss ? -1 : 0)} />
          </div>

          <Panel className="p-4">
            <div className="text-[9px] uppercase tracking-[0.16em] text-neutral-600 mb-3">
              Projected value — {F.fmtPct(conf, 0)} confidence band
            </div>
            {chart && (
              <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-[220px]" role="img" aria-label="Monte Carlo projection bands">
                <path d={chart.area('p05', 'p95')} fill="hsl(var(--gold))" opacity="0.07" />
                <path d={chart.area('p25', 'p75')} fill="hsl(var(--gold))" opacity="0.13" />
                <motion.path d={chart.line('median')} fill="none" stroke="hsl(var(--gold))" strokeWidth="1.6"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
                <path d={chart.line('p95')} fill="none" stroke="hsl(var(--gold))" strokeWidth="0.6" opacity="0.35" />
                <path d={chart.line('p05')} fill="none" stroke="hsl(var(--gold))" strokeWidth="0.6" opacity="0.35" />
              </svg>
            )}
            <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-neutral-700">
              <span>Year 0</span><span>Year {years}</span>
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="text-[9px] uppercase tracking-[0.16em] text-neutral-600 mb-3">Distribution of terminal values</div>
            {mc && (
              <div className="flex items-end gap-[2px] h-[90px]">
                {mc.histogram.map((b, i) => {
                  const max = Math.max(...mc.histogram.map((x) => x.count)) || 1
                  return (
                    <motion.div key={i}
                      initial={{ height: 0 }} animate={{ height: `${(b.count / max) * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.012 }}
                      title={`${money(b.x0)} – ${money(b.x1)}: ${b.count}`}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-gold/25 to-gold/70 hover:from-gold/50 hover:to-gold transition-colors" />
                  )
                })}
              </div>
            )}
            <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-neutral-700">
              <span>{money(mc?.histogram?.[0]?.x0)}</span>
              <span>{money(mc?.histogram?.[mc.histogram.length - 1]?.x1)}</span>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------- Attribution ------------------------------- */

export function LabAttribution() {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const holdings = lab?.holdings || []
  const cur = settings.baseCurrency || 'INR'
  const contrib = useMemo(() => F.contributionAnalysis(holdings, settings), [holdings, settings])
  const total = contrib.reduce((s, c) => s + (c.contribution || 0), 0)
  const maxAbs = Math.max(...contrib.map((c) => Math.abs(c.contribution || 0)), 0.0001)

  const bySector = useMemo(() => {
    const m = new Map()
    for (const c of contrib) m.set(c.sector, (m.get(c.sector) || 0) + (c.contribution || 0))
    return [...m.entries()].map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v)
  }, [contrib])

  return (
    <div className="space-y-4">
      <SectionHead label="Performance Attribution" />
      <Panel className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div className="text-[9px] uppercase tracking-[0.16em] text-neutral-600">Contribution to return by position</div>
          <div className={`text-[13px] font-mono tnum ${tone(total)}`}>{F.fmtSignedPct(total)} total</div>
        </div>
        <div className="space-y-2.5">
          {contrib.map((c, i) => (
            <div key={c.ticker} className="group">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-neutral-400 group-hover:text-neutral-100 transition truncate">{c.name}</span>
                <span className={`font-mono tnum shrink-0 ${tone(c.contribution)}`}>{F.fmtSignedPct(c.contribution)}</span>
              </div>
              <div className="mt-1 h-[3px] w-full rounded-full bg-white/[0.04] relative overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                <motion.div
                  className={`absolute inset-y-0 rounded-full ${c.contribution >= 0 ? 'bg-terminal/70 left-1/2' : 'bg-red-400/70 right-1/2'}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(Math.abs(c.contribution) / maxAbs) * 50}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-neutral-700">
          Contribution = position P&amp;L ÷ total book cost. Sums exactly to the book&apos;s money-weighted return.
        </p>
      </Panel>

      <Panel className="p-5">
        <div className="text-[9px] uppercase tracking-[0.16em] text-neutral-600 mb-3">By sector</div>
        <div className="space-y-2">
          {bySector.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3 text-[11px] py-1 border-b border-white/[0.04] last:border-0">
              <span className="text-neutral-400">{s.label}</span>
              <span className={`font-mono tnum ${tone(s.v)}`}>{F.fmtSignedPct(s.v)}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

/* --------------------------------- Journal --------------------------------- */

const TYPE_TONE = {
  Buy: 'text-terminal-soft border-terminal/25 bg-terminal/[0.06]',
  Sell: 'text-red-400 border-red-400/25 bg-red-400/[0.06]',
  Increase: 'text-terminal-soft border-terminal/20 bg-terminal/[0.04]',
  Reduce: 'text-orange-300/80 border-orange-400/20 bg-orange-400/[0.05]',
  Watchlist: 'text-gold-soft border-gold/25 bg-gold/[0.06]',
  'Research Update': 'text-sky-300/80 border-sky-400/25 bg-sky-400/[0.06]',
  Reflection: 'text-neutral-400 border-white/10 bg-white/[0.03]',
}

export function LabJournal() {
  const { lab } = useSite()
  const entries = useMemo(
    () => [...(lab?.journal || [])].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [lab]
  )
  const [filter, setFilter] = useState('All')
  const types = ['All', ...new Set(entries.map((e) => e.type))]
  const view = filter === 'All' ? entries : entries.filter((e) => e.type === filter)

  return (
    <div>
      <SectionHead label={`Investment Journal (${entries.length})`} />
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-2.5 py-1 rounded text-[9.5px] uppercase tracking-[0.1em] border transition focus-ring ${
              filter === t ? 'bg-gold/[0.1] border-gold/30 text-gold' : 'bg-white/[0.02] border-white/[0.07] text-neutral-500 hover:text-neutral-200'
            }`}>{t}</button>
        ))}
      </div>

      <div className="relative pl-5">
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/[0.07]" />
        {view.map((e, i) => (
          <motion.div key={e.id}
            initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4, delay: i * 0.04 }}
            className="relative pb-5 last:pb-0">
            <span className="absolute -left-5 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-gold/50 bg-[#090B10]" />
            <Panel className="p-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`text-[8.5px] uppercase tracking-[0.1em] px-1.5 py-[2px] rounded border ${TYPE_TONE[e.type] || TYPE_TONE.Reflection}`}>
                  {e.type}
                </span>
                <span className="text-[9.5px] font-mono text-neutral-600">{e.date}</span>
              </div>
              <div className="mt-2 font-serif text-[15px] text-neutral-50 leading-snug">{e.title}</div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-neutral-500">{e.body}</p>
              {e.tags?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">{e.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
              )}
            </Panel>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------- Letters --------------------------------- */

export function LabLetters() {
  const { lab } = useSite()
  const letters = lab?.letters || []
  const [open, setOpen] = useState(null)

  return (
    <div>
      <SectionHead label={`Quarterly Letters (${letters.length})`} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {letters.map((l, i) => (
          <motion.button key={l.id}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
            onClick={() => setOpen(l)}
            className="text-left rounded-xl border border-white/[0.07] bg-[#11161D]/60 p-5 hover:border-gold/25 hover:-translate-y-0.5 transition-all group focus-ring">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.18em] text-gold/80">{l.quarter}</span>
              <span className="text-[9.5px] font-mono text-neutral-700">{l.date}</span>
            </div>
            <div className="mt-2.5 font-serif text-[18px] text-neutral-50 leading-snug group-hover:text-gold transition">{l.title}</div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-neutral-500 line-clamp-3">{l.summary}</p>
            <div className="mt-3.5 pt-3 border-t border-white/[0.06] text-[9px] uppercase tracking-[0.14em] text-gold/70">
              Read letter →
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={() => setOpen(null)}>
            <div className="absolute inset-0 bg-[#090B10]/90 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-white/[0.09] bg-[#11161D] p-6">
              <button onClick={() => setOpen(null)} aria-label="Close"
                className="absolute top-4 right-4 h-7 w-7 rounded-md border border-white/[0.1] flex items-center justify-center text-neutral-500 hover:text-neutral-100 transition focus-ring">
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="text-[9px] uppercase tracking-[0.2em] text-gold/80">{open.quarter}</div>
              <h3 className="mt-2 font-serif text-[26px] leading-tight text-neutral-50 pr-8">{open.title}</h3>
              <div className="mt-5 space-y-4">
                {[['Summary', open.summary], ['Market View', open.marketView], ['Portfolio Review', open.portfolioReview], ['Lessons', open.lessons]]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[9px] uppercase tracking-[0.16em] text-gold/70">{k}</div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-400">{v}</p>
                    </div>
                  ))}
              </div>
              {open.pdfUrl && (
                <a href={open.pdfUrl} target="_blank" rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-white/[0.1] text-[10px] uppercase tracking-[0.12em] text-neutral-300 hover:text-gold hover:border-gold/30 transition">
                  <Download className="h-3 w-3" /> Download PDF
                </a>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------------------------- Notes ---------------------------------- */

export function LabNotes() {
  const { lab } = useSite()
  const notes = lab?.notes || []
  const [cat, setCat] = useState('All')
  const cats = ['All', ...new Set(notes.map((n) => n.category))]
  const view = cat === 'All' ? notes : notes.filter((n) => n.category === cat)

  return (
    <div>
      <SectionHead label={`Research Notes (${notes.length})`} />
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-2.5 py-1 rounded text-[9.5px] uppercase tracking-[0.1em] border transition focus-ring ${
              cat === c ? 'bg-gold/[0.1] border-gold/30 text-gold' : 'bg-white/[0.02] border-white/[0.07] text-neutral-500 hover:text-neutral-200'
            }`}>{c}</button>
        ))}
      </div>
      <Panel className="divide-y divide-white/[0.05]">
        {view.map((n, i) => (
          <motion.div key={n.id}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="p-4 hover:bg-white/[0.015] transition group">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[8.5px] uppercase tracking-[0.14em] text-gold/75">{n.category}</span>
              <span className="text-[9.5px] font-mono text-neutral-700">{n.date}</span>
            </div>
            <div className="mt-1.5 text-[13.5px] text-neutral-100 leading-snug group-hover:text-gold transition">{n.title}</div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-neutral-500 max-w-3xl">{n.summary}</p>
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              {(n.tags || []).map((t) => <Chip key={t}>{t}</Chip>)}
              {n.fileUrl && (
                <a href={n.fileUrl} target="_blank" rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-gold/70 hover:text-gold transition">
                  <FileText className="h-2.5 w-2.5" /> PDF
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </Panel>
      {view.length === 0 && <div className="py-12 text-center text-[12px] text-neutral-600">No notes in this category.</div>}
    </div>
  )
}

/* ------------------------------- Transactions ------------------------------- */

export function LabTransactions() {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const cur = settings.baseCurrency || 'INR'
  const rows = useMemo(() => {
    const out = []
    for (const h of lab?.holdings || []) {
      if (h.entryDate) out.push({ date: h.entryDate, type: 'Buy', name: h.name, ticker: h.ticker, qty: h.quantity, price: h.entryPrice, currency: h.currency })
      if (h.exitDate) out.push({ date: h.exitDate, type: 'Sell', name: h.name, ticker: h.ticker, qty: h.quantity, price: h.exitPrice, currency: h.currency })
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [lab])

  return (
    <div>
      <SectionHead label={`Transactions (${rows.length})`} />
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                {['Date', 'Type', 'Security', 'Ticker', 'Qty', 'Price', 'Value'].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 text-[8.5px] uppercase tracking-[0.14em] text-neutral-600 ${i > 3 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition">
                  <td className="px-3 py-2.5 text-[10.5px] font-mono text-neutral-500">{r.date}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[8.5px] uppercase tracking-[0.1em] px-1.5 py-[2px] rounded border ${
                      r.type === 'Buy' ? 'text-terminal-soft border-terminal/25 bg-terminal/[0.06]' : 'text-red-400 border-red-400/25 bg-red-400/[0.06]'
                    }`}>{r.type}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px] text-neutral-300 truncate">{r.name}</td>
                  <td className="px-3 py-2.5 text-[10.5px] font-mono text-neutral-600">{r.ticker}</td>
                  <td className="px-3 py-2.5 text-right text-[10.5px] font-mono text-neutral-400 tnum">{F.fmtNum(r.qty, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-[10.5px] font-mono text-neutral-400 tnum">{F.fmtNum(r.price, 2)}</td>
                  <td className="px-3 py-2.5 text-right text-[10.5px] font-mono text-neutral-300 tnum">{F.fmtMoney(r.qty * r.price, r.currency || cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

/* ------------------------------ Holding memo ------------------------------ */

const MEMO_FIELDS = [
  ['thesis', 'Investment Thesis'], ['whyBought', 'Why I Bought It'], ['valuation', 'Valuation'],
  ['catalysts', 'Catalysts'], ['risks', 'Risks'], ['moat', 'Competitive Advantage'],
  ['management', 'Management Quality'], ['industryOutlook', 'Industry Outlook'],
  ['financialSnapshot', 'Financial Snapshot'], ['keyRatios', 'Key Ratios'],
  ['exitStrategy', 'Exit Strategy'], ['monitoringChecklist', 'Monitoring Checklist'],
  ['lessons', 'Lessons Learned'],
]

export function HoldingMemo({ holding, open, onClose }) {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const cur = settings.baseCurrency || 'INR'
  if (!holding) return null
  const m = holding.memo || {}
  const pm = F.positionMetrics(holding, cur, settings.fxRates || {})

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
          <div className="absolute inset-0 bg-[#090B10]/92 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl my-8 rounded-xl border border-white/[0.09] bg-[#11161D]">
            {/* header */}
            <div className="sticky top-0 z-10 bg-[#11161D] border-b border-white/[0.07] px-6 py-4 rounded-t-xl">
              <button onClick={onClose} aria-label="Close"
                className="absolute top-4 right-4 h-7 w-7 rounded-md border border-white/[0.1] flex items-center justify-center text-neutral-500 hover:text-neutral-100 transition focus-ring">
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-2.5 flex-wrap pr-8">
                <span className="text-[8.5px] uppercase tracking-[0.14em] text-gold/80">{holding.sector}</span>
                <span className="text-[9.5px] font-mono text-neutral-700">{holding.ticker} · {holding.exchange}</span>
                <span className={`text-[8.5px] uppercase tracking-[0.1em] px-1.5 py-[2px] rounded border ${
                  holding.status === 'Holding' ? 'text-terminal-soft border-terminal/25 bg-terminal/[0.06]'
                  : holding.status === 'Watchlist' ? 'text-gold-soft border-gold/25 bg-gold/[0.06]'
                  : 'text-neutral-500 border-white/10 bg-white/[0.03]'
                }`}>{holding.status}</span>
              </div>
              <h3 className="mt-1.5 font-serif text-[24px] leading-tight text-neutral-50">{holding.name}</h3>
            </div>

            <div className="p-6">
              {/* position snapshot */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <Metric label="Entry" value={F.fmtNum(holding.entryPrice, 2)} sub={holding.entryDate || '—'} />
                <Metric label="Current" value={F.fmtNum(pm.price, 2)} sub={holding.currency} />
                <Metric label="Return" value={F.fmtSignedPct(pm.returnPct)} subTone={tone(pm.returnPct)} />
                <Metric label="P&L" value={pm.pnl === null ? 'N/A' : F.fmtMoney(pm.pnl, cur)} subTone={tone(pm.pnl)} />
              </div>

              {holding.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">{holding.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
              )}

              {/* memo body */}
              <div className="mt-6 space-y-4">
                {MEMO_FIELDS.filter(([k]) => m[k]).map(([k, label]) => (
                  <div key={k} className="pb-4 border-b border-white/[0.05] last:border-0">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-gold/70">{label}</div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-400 whitespace-pre-wrap">{m[k]}</p>
                  </div>
                ))}
              </div>

              {(m.attachments || []).length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/[0.06]">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-neutral-600 mb-2">Downloads</div>
                  <div className="flex flex-wrap gap-2">
                    {m.attachments.map((a) => (
                      <a key={a.url} href={a.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/[0.08] text-[10px] text-neutral-400 hover:text-gold hover:border-gold/30 transition">
                        <Download className="h-3 w-3" /> {a.label || 'Attachment'}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
