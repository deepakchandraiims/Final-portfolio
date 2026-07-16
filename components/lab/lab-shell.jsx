'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, PieChart, Table2, FileText, BookOpen, ArrowLeftRight,
  LineChart, ShieldAlert, Mail, Layers3, Dices, Settings2,
  ArrowLeft, Info, Menu, X,
} from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Shell, Panel } from '@/components/shared/layout'

export const LAB_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart },
  { id: 'holdings', label: 'Holdings', icon: Table2 },
  { id: 'notes', label: 'Research Notes', icon: FileText },
  { id: 'journal', label: 'Investment Journal', icon: BookOpen },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'analytics', label: 'Analytics', icon: LineChart },
  { id: 'risk', label: 'Risk Metrics', icon: ShieldAlert },
  { id: 'letters', label: 'Quarterly Letters', icon: Mail },
  { id: 'attribution', label: 'Performance Attribution', icon: Layers3 },
  { id: 'montecarlo', label: 'Monte Carlo', icon: Dices },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

/* The disclosure is not decoration. It is loaded from the CMS and rendered
   before any number, because a hypothetical book presented without that
   framing is the difference between research and a performance claim. */
export function Disclosure({ text }) {
  return (
    <div className="rounded-lg border border-gold/20 bg-gold/[0.04] px-4 py-3 flex items-start gap-3">
      <Info className="h-3.5 w-3.5 text-gold/80 mt-[3px] shrink-0" />
      <p className="text-[11px] leading-relaxed text-gold-soft/85">{text}</p>
    </div>
  )
}

function SidebarNav({ active, onSelect, onClose }) {
  return (
    <nav className="space-y-0.5">
      {LAB_SECTIONS.map((s) => {
        const Icon = s.icon
        const on = active === s.id
        return (
          <button
            key={s.id}
            onClick={() => { onSelect(s.id); onClose?.() }}
            aria-current={on ? 'page' : undefined}
            className={`relative w-full text-left px-3 py-[7px] rounded-md text-[11.5px] flex items-center gap-2.5 transition focus-ring ${
              on ? 'text-gold bg-gold/[0.07]' : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]'
            }`}
          >
            {on && <motion.span layoutId="labActive" className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-gold" />}
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{s.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function LabShell({ children, active, onSelect }) {
  const { lab, owner } = useSite()
  const settings = lab?.settings || {}
  const [mobileNav, setMobileNav] = useState(false)

  // Deep-link support: /lab#holdings
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace('#', '')
      if (h && LAB_SECTIONS.some((s) => s.id === h)) onSelect(h)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [onSelect])

  const select = (id) => {
    onSelect(id)
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${id}`)
  }

  const current = LAB_SECTIONS.find((s) => s.id === active)

  return (
    <div className="min-h-screen fin-bg">
      <div className="absolute inset-0 noise-bg pointer-events-none" />
      <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />

      {/* top bar */}
      <header className="sticky top-0 z-40 bg-[#090B10]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <Shell>
          <div className="h-14 flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-neutral-500 hover:text-gold transition focus-ring rounded shrink-0">
              <ArrowLeft className="h-3 w-3" /> Portfolio
            </Link>
            <span className="h-4 w-px bg-white/10" />
            <div className="min-w-0">
              <div className="text-[11px] font-medium tracking-[0.14em] uppercase text-neutral-100 truncate">Investment Lab</div>
              <div className="text-[8.5px] tracking-[0.16em] uppercase text-neutral-600 truncate">{settings.portfolioName}</div>
            </div>
            <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full bg-gold/70" /> Hypothetical
            </span>
            <button onClick={() => setMobileNav(true)} aria-label="Lab sections"
              className="lg:hidden h-8 w-8 rounded-md border border-white/[0.08] flex items-center justify-center text-neutral-400 focus-ring">
              <Menu className="h-3.5 w-3.5" />
            </button>
          </div>
        </Shell>
      </header>

      <Shell className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr] gap-6 py-6">
          {/* sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <div className="text-[8.5px] uppercase tracking-[0.2em] text-neutral-600 px-3 pb-2">Sections</div>
              <SidebarNav active={active} onSelect={select} />
              <div className="mt-5 px-3 pt-4 border-t border-white/[0.06]">
                <div className="text-[8.5px] uppercase tracking-[0.16em] text-neutral-700 leading-relaxed">
                  Educational record<br />Not investment advice
                </div>
              </div>
            </div>
          </aside>

          {/* content */}
          <main className="min-w-0">
            <div className="mb-4 lg:hidden">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold/70">{current?.label}</div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </Shell>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-[#090B10]/90 backdrop-blur-xl" onClick={() => setMobileNav(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 bottom-0 w-[80%] max-w-[280px] bg-[#11161D] border-l border-white/[0.07] p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Sections</span>
                <button onClick={() => setMobileNav(false)} aria-label="Close"
                  className="h-8 w-8 rounded-md border border-white/[0.1] flex items-center justify-center text-neutral-400 focus-ring">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <SidebarNav active={active} onSelect={select} onClose={() => setMobileNav(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* Landing hero — shown above the Overview section only. */
export function LabHero() {
  const { lab } = useSite()
  const s = lab?.settings || {}
  return (
    <div className="mb-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="text-[9px] uppercase tracking-[0.24em] text-gold/80">{s.portfolioName}</div>
        <h1 className="mt-2.5 font-serif text-[34px] md:text-[46px] leading-[1.04] tracking-[-0.02em] text-neutral-50">
          Investment <span className="text-gold">Lab</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-neutral-500">
          A transparent record of my investment thinking, portfolio construction, valuation methodology,
          risk management, and post-investment analysis.
        </p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-5">
        <Disclosure text={s.disclosure} />
      </motion.div>
    </div>
  )
}
