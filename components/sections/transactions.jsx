'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Landmark } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead, Chip } from '@/components/shared/layout'

const typeBadgeClass = (t) => {
  const map = {
    'IPO': 'text-sky-300/80 border-sky-400/25 bg-sky-400/[0.07]',
    'M&A': 'text-gold-soft border-gold/25 bg-gold/[0.07]',
    'Valuation': 'text-violet-300/80 border-violet-400/25 bg-violet-400/[0.06]',
    'Operating Model': 'text-terminal-soft border-terminal/25 bg-terminal/[0.06]',
    'Debt': 'text-orange-300/70 border-orange-400/20 bg-orange-400/[0.05]',
  }
  return map[t] || 'text-neutral-400 border-white/10 bg-white/[0.03]'
}

/* Tombstone — the IB "deal card". Compact, dense, scannable. */
const Tombstone = ({ t, onOpen, i }) => (
  <motion.button
    layout
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.4, delay: (i % 4) * 0.04 }}
    onClick={() => onOpen(t)}
    className="group text-left rounded-xl border border-white/[0.07] bg-[#11161D]/60 p-4 flex flex-col transition-all duration-300 hover:border-gold/25 hover:-translate-y-0.5 focus-ring"
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[8.5px] font-mono text-neutral-700">#{t.dealNumber} · {t.year}</span>
      <span className={`text-[8px] uppercase tracking-[0.12em] px-1.5 py-[2px] rounded border ${typeBadgeClass(t.type)}`}>{t.type}</span>
    </div>

    <div className="mt-3 text-center py-2">
      <div className="font-serif text-[15px] leading-tight text-neutral-50 group-hover:text-gold transition">{t.target}</div>
      <div className="mt-1 text-[10px] text-neutral-600 leading-snug line-clamp-2">{t.subtitle}</div>
    </div>

    <div className="mt-2 pt-2.5 border-t border-white/[0.06] space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[8.5px] uppercase tracking-[0.12em] text-neutral-700">Sector</span>
        <span className="text-[10px] text-neutral-400 truncate text-right">{t.sector}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[8.5px] uppercase tracking-[0.12em] text-neutral-700">Size</span>
        <span className="text-[10px] font-mono text-gold-soft tnum">{t.size}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[8.5px] uppercase tracking-[0.12em] text-neutral-700">Role</span>
        <span className="text-[10px] text-neutral-400 truncate text-right">{t.role}</span>
      </div>
    </div>

    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between mt-auto">
      <span className="text-[9px] uppercase tracking-[0.12em] text-gold/70 group-hover:text-gold transition inline-flex items-center gap-1">
        {t.projectId ? 'View case study' : 'Details'}
        <ArrowUpRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </div>
  </motion.button>
)

export const SelectedTransactions = ({ onOpenProject }) => {
  const { transactions, projects } = useSite()
  const [showAll, setShowAll] = useState(false)
  const list = transactions || []
  const visible = showAll ? list : list.slice(0, 4)

  const open = (t) => {
    const p = (projects || []).find((x) => x.id === t.projectId)
    if (p) onOpenProject(p)
  }

  if (!list.length) return null

  return (
    <Section id="transactions">
      <SectionHead
        icon={Landmark}
        label="Selected Transactions"
        action={showAll ? 'Show fewer' : `View all transactions (${list.length})`}
        onAction={(e) => { e.preventDefault(); setShowAll((v) => !v) }}
      />
      <p className="-mt-2 mb-4 text-[11px] text-neutral-600 max-w-2xl">
        Tombstone-style summary of representative mandates. Confidential clients are anonymised; each has a corresponding artefact available on request.
      </p>
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {visible.map((t, i) => <Tombstone key={t.id} t={t} i={i} onOpen={open} />)}
        </AnimatePresence>
      </motion.div>
    </Section>
  )
}
