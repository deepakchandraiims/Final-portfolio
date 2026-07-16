'use client'

import { useState, useEffect, useCallback } from 'react'
import { SEED_CONTENT } from '@/lib/portfolio-data'
import { SiteContext } from '@/components/shared/site-context'
import { AnalyticsBeacon } from '@/components/shared/analytics-beacon'
import { LabShell, LabHero, Disclosure } from '@/components/lab/lab-shell'
import { LabOverview, LabAllocation, LabHoldings } from '@/components/lab/lab-sections'
import {
  LabRisk, LabMonteCarlo, LabAttribution, LabJournal,
  LabLetters, LabNotes, LabTransactions, HoldingMemo,
} from '@/components/lab/lab-advanced'
import { Panel, SectionHead, Chip } from '@/components/shared/layout'
import * as F from '@/lib/finance'

function LabSettings() {
  const [s, setS] = useState(null)
  useEffect(() => {
    fetch('/api/lab/status').then((r) => r.json()).then(setS).catch(() => setS(null))
  }, [])

  const { lab } = { lab: null }
  return (
    <div className="space-y-4">
      <SectionHead label="Settings" />
      <Panel className="p-5">
        <div className="text-[9px] uppercase tracking-[0.2em] text-gold/70">Market data</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="text-[8.5px] uppercase tracking-[0.14em] text-neutral-600">Provider</div>
            <div className="mt-1 text-[12px] font-mono text-neutral-200">{s?.provider?.label || '—'}</div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="text-[8.5px] uppercase tracking-[0.14em] text-neutral-600">Status</div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${s?.provider?.configured ? 'bg-terminal' : 'bg-neutral-600'}`} />
              <span className="text-[12px] text-neutral-200">{s?.provider?.configured ? 'Configured' : 'Not configured'}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="text-[8.5px] uppercase tracking-[0.14em] text-neutral-600">Valuation history</div>
            <div className="mt-1 text-[12px] font-mono text-neutral-200">{s?.valuations ?? 0} days</div>
          </div>
        </div>

        {!s?.provider?.configured && (
          <div className="mt-4 p-4 rounded-lg bg-gold/[0.05] border border-gold/20 text-[11.5px] text-gold-soft/90 leading-relaxed">
            No market-data provider is configured, so the Lab uses the prices entered in Admin →
            Investment Lab. To go live, set <span className="font-mono">MARKET_DATA_PROVIDER</span> and{' '}
            <span className="font-mono">MARKET_DATA_API_KEY</span> in Vercel and redeploy. Supported:{' '}
            {(s?.provider?.available || []).map((p) => p.id).join(', ') || 'fmp, finnhub, twelvedata, alphavantage, yahoo'}.
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">Everything else</div>
          <p className="mt-2 text-[11.5px] text-neutral-500 leading-relaxed max-w-2xl">
            Portfolio name, capital, start date, benchmark, FX rates, philosophy, every instrument and
            every memo are edited in <a href="/admin" className="text-gold hover:underline">Admin → Investment Lab</a>.
            No values in this Lab are hardcoded.
          </p>
        </div>
      </Panel>
    </div>
  )
}

export default function LabPage() {
  const [content, setContent] = useState(SEED_CONTENT)
  const [active, setActive] = useState('overview')
  const [memo, setMemo] = useState(null)
  const [memoOpen, setMemoOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/content')
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d && !d.error) setContent({ ...SEED_CONTENT, ...d }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Merge live quotes + valuation history into the lab slice.
  useEffect(() => {
    let cancelled = false
    fetch('/api/lab/quotes')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d || d.error) return
        setContent((c) => {
          const lab = c.lab || {}
          const holdings = (lab.holdings || []).map((h) => {
            const q = d.quotes?.[h.ticker]
            return q?.price ? { ...h, currentPrice: q.price, quote: q } : h
          })
          return { ...c, lab: { ...lab, holdings, valuations: d.valuations || lab.valuations } }
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const openMemo = useCallback((h) => { setMemo(h); setMemoOpen(true) }, [])
  const closeMemo = useCallback(() => { setMemoOpen(false); setTimeout(() => setMemo(null), 220) }, [])

  const disclosure = content.lab?.settings?.disclosure

  const render = () => {
    switch (active) {
      case 'overview': return <><LabHero /><LabOverview /></>
      case 'portfolio': return <><Disclosure text={disclosure} /><div className="mt-4"><LabAllocation /></div></>
      case 'holdings': return <LabHoldings onOpenHolding={openMemo} />
      case 'notes': return <LabNotes />
      case 'journal': return <LabJournal />
      case 'transactions': return <LabTransactions />
      case 'analytics': return <LabAttribution />
      case 'risk': return <LabRisk />
      case 'letters': return <LabLetters />
      case 'attribution': return <LabAttribution />
      case 'montecarlo': return <LabMonteCarlo />
      case 'settings': return <LabSettings />
      default: return <><LabHero /><LabOverview /></>
    }
  }

  return (
    <SiteContext.Provider value={content}>
      <AnalyticsBeacon />
      <LabShell active={active} onSelect={setActive}>
        {render()}
      </LabShell>
      <HoldingMemo holding={memo} open={memoOpen} onClose={closeMemo} />
    </SiteContext.Provider>
  )
}
