'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Download, ArrowUpDown, TriangleAlert, ExternalLink } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Panel, SectionHead, Chip } from '@/components/shared/layout'
import { CountUp } from '@/components/shared/primitives'
import * as F from '@/lib/finance'

/* ------------------------------- shared bits ------------------------------- */

const tone = (x) => (x === null || x === undefined ? 'text-neutral-500' : x > 0 ? 'text-terminal' : x < 0 ? 'text-red-400' : 'text-neutral-300')

export function Metric({ label, value, sub, subTone, hint }) {
  return (
    <div className="p-3.5 rounded-lg border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] transition group" title={hint}>
      <div className="text-[8.5px] uppercase tracking-[0.14em] text-neutral-600 leading-tight">{label}</div>
      <div className="mt-1.5 font-serif text-[17px] leading-none text-neutral-50 tnum">{value}</div>
      {sub !== undefined && sub !== null && (
        <div className={`mt-1.5 text-[9.5px] font-mono tnum ${subTone || 'text-neutral-600'}`}>{sub}</div>
      )}
    </div>
  )
}

function FxWarning({ missing }) {
  if (!missing?.length) return null
  return (
    <div className="mb-4 rounded-lg border border-red-400/25 bg-red-400/[0.05] px-3.5 py-2.5 flex items-start gap-2.5">
      <TriangleAlert className="h-3.5 w-3.5 text-red-400 mt-[2px] shrink-0" />
      <div className="text-[11px] text-red-300/90 leading-relaxed">
        Missing FX rate for {missing.map((m) => m.currency).filter(Boolean).join(', ')} —
        {' '}{missing.length} position{missing.length > 1 ? 's are' : ' is'} excluded from portfolio totals rather than
        summed at 1:1. Add the rate in Admin → Investment Lab → Portfolio Settings.
      </div>
    </div>
  )
}

/* --------------------------------- Overview --------------------------------- */

export function LabOverview({ onSelect }) {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const holdings = lab?.holdings || []
  const cur = settings.baseCurrency || 'INR'

  const s = useMemo(() => F.portfolioSummary(holdings, settings), [holdings, settings])
  const money = (x) => F.fmtMoney(x, cur)

  return (
    <div className="space-y-5">
      <FxWarning missing={s.fxMissing} />

      {/* headline value */}
      <Panel className="p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 items-center">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">Portfolio value</div>
            <div className="mt-2 font-serif text-[38px] md:text-[46px] leading-none text-neutral-50 tnum">
              {money(s.totalValue)}
            </div>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <span className={`text-[13px] font-mono tnum ${tone(s.absoluteReturn)}`}>
                {F.fmtSignedPct(s.absoluteReturn)}
              </span>
              <span className="text-[11px] text-neutral-600">
                vs {money(s.initialCapital)} initial
              </span>
              {s.years !== null && (
                <span className="text-[11px] text-neutral-700 font-mono">{s.years.toFixed(1)}y</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Unrealised P&L" value={money(s.unrealised)} sub={F.fmtSignedPct(s.invested > 0 ? s.unrealised / s.invested : null)} subTone={tone(s.unrealised)} />
            <Metric label="Realised P&L" value={money(s.realised)} sub={s.exitedCount + ' closed'} subTone={tone(s.realised)} />
            <Metric label="CAGR" value={F.fmtSignedPct(s.annualisedReturn)} sub="annualised" hint="Compound annual growth rate since portfolio start date" />
            <Metric label="Cash" value={money(s.cash)} sub={F.fmtPct(s.cashWeight) + ' of book'} />
          </div>
        </div>
      </Panel>

      {/* book stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <Metric label="Holdings" value={<CountUp raw={String(s.holdingsCount)} />} />
        <Metric label="Sectors" value={<CountUp raw={String(s.sectorCount)} />} />
        <Metric label="Invested" value={money(s.invested)} />
        <Metric label="Market value" value={money(s.marketValue)} />
        <Metric label="Win ratio" value={F.fmtPct(s.winRatio)} hint="Share of open positions currently in profit" />
        <Metric label="Live prices" value={`${s.livePrices}/${s.holdingsCount}`} hint="Positions with a market-data price rather than entry price" />
      </div>

      {/* philosophy */}
      <Panel className="p-5">
        <div className="text-[9px] uppercase tracking-[0.2em] text-gold/70">Philosophy</div>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-neutral-400 max-w-3xl">{settings.philosophy}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip tone="gold">{settings.horizon}</Chip>
          <Chip>{settings.riskProfile}</Chip>
          <Chip>Benchmark: {settings.benchmark?.toUpperCase()}</Chip>
          <Chip>Base: {cur}</Chip>
        </div>
      </Panel>

      <LabAllocation compact onSelect={onSelect} />
    </div>
  )
}

/* -------------------------------- Allocation -------------------------------- */

const DONUT_COLORS = ['#C8A76A', '#8B9098', '#32D583', '#5FA8D3', '#D96A4A', '#9C8CC4', '#E4CB96', '#4B8BBE']

function Donut({ data, size = 168 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null
  const R = size / 2, r = R * 0.62, C = 2 * Math.PI * ((R + r) / 2)
  let offset = 0
  const stroke = R - r
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[168px]" role="img" aria-label="Asset allocation">
      <g transform={`rotate(-90 ${R} ${R})`}>
        {data.map((d, i) => {
          const frac = d.value / total
          const dash = frac * C
          const el = (
            <motion.circle
              key={d.label}
              cx={R} cy={R} r={(R + r) / 2}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
            />
          )
          offset += dash
          return el
        })}
      </g>
    </svg>
  )
}

export function LabAllocation({ compact = false }) {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const holdings = lab?.holdings || []
  const cur = settings.baseCurrency || 'INR'
  const s = useMemo(() => F.portfolioSummary(holdings, settings), [holdings, settings])
  const [hover, setHover] = useState(null)

  const sectorHoldings = (sector) =>
    F.holdingWeights(holdings, settings).filter((h) => (h.sector || 'Unclassified') === sector)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* asset allocation */}
      <div>
        <SectionHead label="Asset Allocation" />
        <Panel className="p-5">
          <div className="flex items-center gap-5">
            <Donut data={s.assetAllocation} />
            <div className="flex-1 min-w-0 space-y-1.5">
              {s.assetAllocation.map((a, i) => (
                <div key={a.label} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-neutral-400 truncate flex-1">{a.label}</span>
                  <span className="font-mono text-neutral-300 tnum">{F.fmtPct(a.weight, 1)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* sector allocation */}
      <div>
        <SectionHead label="Sector Allocation" />
        <Panel className="p-5">
          <div className="space-y-2.5">
            {s.sectorAllocation.map((sec, i) => (
              <div key={sec.label}
                onMouseEnter={() => setHover(sec.label)} onMouseLeave={() => setHover(null)}
                className="group cursor-default">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-neutral-400 group-hover:text-neutral-100 transition truncate">{sec.label}</span>
                  <span className="font-mono text-neutral-500 tnum shrink-0">{F.fmtPct(sec.weight, 1)}</span>
                </div>
                <div className="mt-1 h-[3px] w-full rounded-full bg-white/[0.05] overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold"
                    initial={{ width: 0 }} whileInView={{ width: `${sec.weight * 100}%` }}
                    viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
                </div>
                {hover === sec.label && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden">
                    <div className="mt-1.5 pl-2 border-l border-gold/25 space-y-0.5">
                      {sectorHoldings(sec.label).map((h) => (
                        <div key={h.id || h.ticker} className="flex items-center justify-between text-[10px]">
                          <span className="text-neutral-500 truncate">{h.name}</span>
                          <span className="font-mono text-neutral-600 tnum">{F.fmtMoney(h.value, cur)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* --------------------------------- Holdings --------------------------------- */

const COLS = [
  { k: 'name', label: 'Company', w: 'min-w-[180px]' },
  { k: 'ticker', label: 'Ticker' },
  { k: 'sector', label: 'Sector' },
  { k: 'weight', label: 'Weight', num: true },
  { k: 'entryPrice', label: 'Entry', num: true },
  { k: 'price', label: 'Price', num: true },
  { k: 'pnl', label: 'Gain/Loss', num: true },
  { k: 'returnPct', label: 'Return', num: true },
  { k: 'status', label: 'Status' },
]

function toCsv(rows, cur) {
  const head = ['Company', 'Ticker', 'Exchange', 'ISIN', 'Sector', 'Industry', 'Asset Class', 'Country', 'Currency', 'Status', 'Entry Date', 'Quantity', 'Entry Price', 'Current Price', `Cost (${cur})`, `Value (${cur})`, `P&L (${cur})`, 'Return %', 'Weight %']
  const body = rows.map((h) => [
    h.name, h.ticker, h.exchange, h.isin, h.sector, h.industry, h.assetClass, h.country, h.currency, h.status,
    h.entryDate, h.quantity, h.entryPrice, h.currentPrice ?? '',
    h.cost ?? '', h.value ?? '', h.pnl ?? '',
    h.returnPct === null || h.returnPct === undefined ? '' : (h.returnPct * 100).toFixed(2),
    h.weight === null || h.weight === undefined ? '' : (h.weight * 100).toFixed(2),
  ])
  return [head, ...body]
    .map((r) => r.map((c) => {
      const v = c === null || c === undefined ? '' : String(c)
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }).join(','))
    .join('\n')
}

export function LabHoldings({ onOpenHolding }) {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const all = lab?.holdings || []
  const cur = settings.baseCurrency || 'INR'

  const [q, setQ] = useState('')
  const [sector, setSector] = useState('All')
  const [assetClass, setAssetClass] = useState('All')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState({ k: 'weight', dir: 'desc' })
  const [page, setPage] = useState(0)
  const PER = 10

  // Weighted rows for open positions; non-open rows still need metrics.
  const rows = useMemo(() => {
    const weighted = F.holdingWeights(all, settings)
    const byId = new Map(weighted.map((w) => [w.id || w.ticker, w]))
    return all.map((h) => {
      const w = byId.get(h.id || h.ticker)
      const m = w || F.positionMetrics(h, cur, settings.fxRates || {})
      return { ...h, ...m, weight: w?.weight ?? null }
    })
  }, [all, settings, cur])

  const sectors = useMemo(() => ['All', ...new Set(all.map((h) => h.sector).filter(Boolean))], [all])
  const classes = useMemo(() => ['All', ...new Set(all.map((h) => h.assetClass).filter(Boolean))], [all])
  const statuses = ['All', 'Holding', 'Exited', 'Watchlist', 'Closed']

  const filtered = useMemo(() => {
    let r = rows.filter((h) => {
      if (sector !== 'All' && h.sector !== sector) return false
      if (assetClass !== 'All' && h.assetClass !== assetClass) return false
      if (status !== 'All' && (h.status || 'Holding') !== status) return false
      if (q && !`${h.name} ${h.ticker} ${h.sector} ${h.industry}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    r = r.slice().sort((a, b) => {
      const x = a[sort.k], y = b[sort.k]
      if (x === null || x === undefined) return 1
      if (y === null || y === undefined) return -1
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
      return String(x).localeCompare(String(y)) * dir
    })
    return r
  }, [rows, q, sector, assetClass, status, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PER))
  const view = filtered.slice(page * PER, page * PER + PER)

  const download = (text, name, type) => {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  const setSortKey = (k) => setSort((s) => ({ k, dir: s.k === k && s.dir === 'desc' ? 'asc' : 'desc' }))

  return (
    <div>
      <SectionHead label={`Holdings (${filtered.length})`} />

      {/* controls */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search className="h-3 w-3 text-neutral-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search holdings…"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-md pl-7 pr-3 py-1.5 text-[11.5px] focus:outline-none focus:border-gold/40" />
        </div>
        {[[sector, setSector, sectors], [assetClass, setAssetClass, classes], [status, setStatus, statuses]].map(([val, set, opts], i) => (
          <select key={i} value={val} onChange={(e) => { set(e.target.value); setPage(0) }}
            className="bg-white/[0.03] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-[11px] text-neutral-300 focus:outline-none focus:border-gold/40">
            {opts.map((o) => <option key={o} value={o} className="bg-[#11161D]">{o}</option>)}
          </select>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => download(toCsv(filtered, cur), 'holdings.csv', 'text/csv;charset=utf-8')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/[0.08] text-[10px] uppercase tracking-[0.1em] text-neutral-400 hover:text-gold hover:border-gold/30 transition focus-ring">
            <Download className="h-3 w-3" /> CSV
          </button>
          <button onClick={() => download(toCsv(filtered, cur), 'holdings.xls', 'application/vnd.ms-excel')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/[0.08] text-[10px] uppercase tracking-[0.1em] text-neutral-400 hover:text-gold hover:border-gold/30 transition focus-ring">
            <Download className="h-3 w-3" /> Excel
          </button>
        </div>
      </div>

      {/* table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                {COLS.map((c) => (
                  <th key={c.k} className={`px-3 py-2.5 ${c.num ? 'text-right' : ''} ${c.w || ''}`}>
                    <button onClick={() => setSortKey(c.k)}
                      className={`inline-flex items-center gap-1 text-[8.5px] uppercase tracking-[0.14em] transition focus-ring rounded ${
                        sort.k === c.k ? 'text-gold' : 'text-neutral-600 hover:text-neutral-300'
                      }`}>
                      {c.label}
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {view.map((h, i) => (
                <motion.tr key={h.id || h.ticker}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: i * 0.02 }}
                  onClick={() => onOpenHolding?.(h)}
                  className="group hover:bg-white/[0.02] transition cursor-pointer">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-5 w-5 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[8px] text-neutral-500 shrink-0 overflow-hidden">
                        {h.logoUrl ? <img src={h.logoUrl} alt="" className="w-full h-full object-cover" /> : (h.name || '?').charAt(0)}
                      </span>
                      <span className="text-[12px] text-neutral-200 truncate group-hover:text-gold transition">{h.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[10.5px] font-mono text-neutral-500">{h.ticker}</td>
                  <td className="px-3 py-2.5 text-[10.5px] text-neutral-500 truncate">{h.sector}</td>
                  <td className="px-3 py-2.5 text-right text-[10.5px] font-mono text-neutral-400 tnum">{h.weight === null ? '—' : F.fmtPct(h.weight, 1)}</td>
                  <td className="px-3 py-2.5 text-right text-[10.5px] font-mono text-neutral-500 tnum">{F.fmtNum(h.entryPrice, 2)}</td>
                  <td className="px-3 py-2.5 text-right text-[10.5px] font-mono text-neutral-300 tnum">{F.fmtNum(h.price, 2)}</td>
                  <td className={`px-3 py-2.5 text-right text-[10.5px] font-mono tnum ${tone(h.pnl)}`}>{h.pnl === null ? 'N/A' : F.fmtMoney(h.pnl, cur)}</td>
                  <td className={`px-3 py-2.5 text-right text-[10.5px] font-mono tnum ${tone(h.returnPct)}`}>{F.fmtSignedPct(h.returnPct)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[8.5px] uppercase tracking-[0.1em] px-1.5 py-[2px] rounded border ${
                      h.status === 'Holding' ? 'text-terminal-soft border-terminal/25 bg-terminal/[0.06]'
                      : h.status === 'Watchlist' ? 'text-gold-soft border-gold/25 bg-gold/[0.06]'
                      : 'text-neutral-500 border-white/10 bg-white/[0.03]'
                    }`}>{h.status}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {view.length === 0 && (
          <div className="py-12 text-center text-[12px] text-neutral-600">No holdings match these filters.</div>
        )}

        {pages > 1 && (
          <div className="px-3 py-2.5 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-neutral-600 font-mono">
              {page * PER + 1}–{Math.min((page + 1) * PER, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded text-[10px] border border-white/[0.08] text-neutral-400 disabled:opacity-30 hover:border-gold/30 hover:text-gold transition focus-ring">Prev</button>
              <span className="text-[10px] text-neutral-600 font-mono px-1.5">{page + 1}/{pages}</span>
              <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded text-[10px] border border-white/[0.08] text-neutral-400 disabled:opacity-30 hover:border-gold/30 hover:text-gold transition focus-ring">Next</button>
            </div>
          </div>
        )}
      </Panel>
      <p className="mt-2 text-[10px] text-neutral-700">Click any row to open its investment memo.</p>
    </div>
  )
}
