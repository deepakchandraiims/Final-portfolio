'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FlaskConical, ArrowRight, Info, TrendingUp, TrendingDown } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead, Chip } from '@/components/shared/layout'
import { CountUp } from '@/components/shared/primitives'
import * as F from '@/lib/finance'

const tone = (x) => (x === null || x === undefined ? 'text-neutral-500' : x > 0 ? 'text-terminal' : x < 0 ? 'text-red-400' : 'text-neutral-300')
const ALLOC_COLORS = ['#C8A76A', '#8B9098', '#32D583', '#5FA8D3', '#D96A4A', '#9C8CC4', '#E4CB96']

/**
 * Landing-page Investment Lab section.
 *
 * This is the differentiator, so it lives in the scroll — not behind a nav
 * click. It is deliberately a *proof*, not a summary: real numbers off the
 * same finance library the Lab uses, plus the reasoning artefacts (a thesis
 * and a documented mistake) that separate "likes markets" from "allocates
 * capital". The full module is one click away.
 */
export const InvestmentLabSection = () => {
  const { lab } = useSite()
  const settings = lab?.settings || {}
  const holdings = lab?.holdings || []
  const journal = lab?.journal || []
  const cur = settings.baseCurrency || 'INR'

  const s = useMemo(() => F.portfolioSummary(holdings, settings), [holdings, settings])
  const top = useMemo(
    () => F.holdingWeights(holdings, settings).sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 4),
    [holdings, settings]
  )
  // The lesson entry is the strongest signal here — a documented mistake is
  // harder to fake than a winner, and recruiters read it that way.
  const lesson = useMemo(
    () => journal.find((j) => (j.tags || []).includes('Mistake')) || journal.find((j) => j.type === 'Reflection'),
    [journal]
  )
  const alloc = (s.assetAllocation || []).slice(0, 6)
  const money = (x) => F.fmtMoney(x, cur)

  if (!lab || settings.enabled === false || !holdings.length) return null

  return (
    <Section id="lab">
      <SectionHead
        icon={FlaskConical}
        label="Investment Lab"
        action="Enter the Lab"
        href="/lab"
      />

      {/* framing: this is a hypothetical research record, stated before any number */}
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-gold/15 bg-gold/[0.03] px-3.5 py-2.5">
        <Info className="h-3 w-3 text-gold/70 mt-[3px] shrink-0" />
        <p className="text-[10.5px] leading-relaxed text-gold-soft/75">
          Hypothetical portfolio, maintained for educational and portfolio-construction purposes.
          Not investment advice and not a performance claim — the point is the process.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4">
        {/* ---------------- left: the book ---------------- */}
        <div className="space-y-3">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[8.5px] uppercase tracking-[0.18em] text-neutral-600">{settings.portfolioName}</div>
                <div className="mt-1.5 font-serif text-[30px] md:text-[34px] leading-none text-neutral-50 tnum">
                  {money(s.totalValue)}
                </div>
                <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[12px] font-mono tnum ${tone(s.absoluteReturn)}`}>
                    {s.absoluteReturn > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {F.fmtSignedPct(s.absoluteReturn)}
                  </span>
                  <span className="text-[10.5px] text-neutral-700">from {money(s.initialCapital)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-right">
                {[
                  ['CAGR', F.fmtSignedPct(s.annualisedReturn)],
                  ['Holdings', String(s.holdingsCount)],
                  ['Sectors', String(s.sectorCount)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="font-serif text-[16px] text-neutral-100 tnum">{v}</div>
                    <div className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-neutral-600">{k}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* allocation as a single stacked rail — reads instantly */}
            <div className="mt-5">
              <div className="text-[8.5px] uppercase tracking-[0.16em] text-neutral-600 mb-2">Asset allocation</div>
              <div className="flex h-2 w-full rounded-full overflow-hidden bg-white/[0.04]">
                {alloc.map((a, i) => (
                  <motion.div
                    key={a.label}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${a.weight * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length], opacity: 0.85 }}
                    title={`${a.label} · ${F.fmtPct(a.weight, 1)}`}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                {alloc.map((a, i) => (
                  <span key={a.label} className="inline-flex items-center gap-1.5 text-[9.5px] text-neutral-500">
                    <span className="h-1.5 w-1.5 rounded-sm" style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                    {a.label}
                    <span className="font-mono text-neutral-600 tnum">{F.fmtPct(a.weight, 0)}</span>
                  </span>
                ))}
              </div>
            </div>
          </Panel>

          {/* top positions */}
          <Panel className="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.015] flex items-center justify-between">
              <span className="text-[8.5px] uppercase tracking-[0.16em] text-neutral-600">Largest positions</span>
              <span className="text-[8.5px] uppercase tracking-[0.14em] text-neutral-700">Weight · Return</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {top.map((h, i) => (
                <motion.div
                  key={h.id || h.ticker}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="px-4 py-2.5 flex items-center gap-3 group hover:bg-white/[0.02] transition"
                >
                  <span className="h-6 w-6 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[8.5px] text-neutral-500 shrink-0 overflow-hidden">
                    {h.logoUrl ? <img src={h.logoUrl} alt="" className="w-full h-full object-cover" /> : (h.name || '?').charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-neutral-200 truncate">{h.name}</div>
                    <div className="text-[9.5px] text-neutral-600 truncate">{h.sector}</div>
                  </div>
                  <div className="text-[10.5px] font-mono text-neutral-400 tnum shrink-0 w-12 text-right">
                    {F.fmtPct(h.weight, 1)}
                  </div>
                  <div className={`text-[10.5px] font-mono tnum shrink-0 w-16 text-right ${tone(h.returnPct)}`}>
                    {F.fmtSignedPct(h.returnPct)}
                  </div>
                </motion.div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ---------------- right: the thinking ---------------- */}
        <div className="space-y-3">
          <Panel className="p-5">
            <div className="text-[8.5px] uppercase tracking-[0.18em] text-gold/70">Philosophy</div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-neutral-400">{settings.philosophy}</p>
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              <Chip tone="gold">{settings.horizon}</Chip>
              <Chip>{settings.riskProfile}</Chip>
            </div>
          </Panel>

          {lesson && (
            <Panel className="p-5 border-white/[0.09]">
              <div className="flex items-center gap-2">
                <span className="text-[8.5px] uppercase tracking-[0.14em] px-1.5 py-[2px] rounded border border-red-400/25 bg-red-400/[0.06] text-red-400">
                  {lesson.type}
                </span>
                <span className="text-[9px] font-mono text-neutral-700">{lesson.date}</span>
                <span className="ml-auto text-[8.5px] uppercase tracking-[0.14em] text-neutral-700">From the journal</span>
              </div>
              <div className="mt-2.5 font-serif text-[15px] leading-snug text-neutral-50">{lesson.title}</div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-neutral-500 line-clamp-4">{lesson.body}</p>
              <p className="mt-3 pt-3 border-t border-white/[0.06] text-[10px] leading-relaxed text-neutral-600">
                The losers are kept in the record on purpose. A track record with the mistakes removed is
                marketing, not research.
              </p>
            </Panel>
          )}

          {/* what the Lab contains — the click-through argument */}
          <Panel className="p-5">
            <div className="text-[8.5px] uppercase tracking-[0.18em] text-neutral-600">Inside the Lab</div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                'Investment memos', 'Risk metrics',
                'Monte Carlo', 'Attribution',
                'Investment journal', 'Quarterly letters',
              ].map((x) => (
                <div key={x} className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <span className="h-1 w-1 rounded-full bg-gold/50" />{x}
                </div>
              ))}
            </div>
            <Link
              href="/lab"
              className="group mt-4 w-full h-9 rounded-md bg-gold text-[#090B10] text-[10px] font-medium uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 hover:bg-gold-soft transition focus-ring"
            >
              Enter the Investment Lab
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Panel>
        </div>
      </div>
    </Section>
  )
}
