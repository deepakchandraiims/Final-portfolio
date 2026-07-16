'use client'
import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useRevealed } from '@/components/shared/primitives'

// Institutional layout primitives.
// The old design stacked full-height sections at py-24/py-32, which produced
// large dead black bands between content. These enforce a dense, dashboard-like
// rhythm instead — content-led, not padding-led.

export const Shell = ({ children, className = '' }) => (
  <div className={`max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8 ${className}`}>{children}</div>
)

// Compact section wrapper. Vertical rhythm is deliberately tight.
export const Section = ({ id, children, className = '', tight = false }) => (
  <section id={id} className={`relative ${tight ? 'py-8 md:py-10' : 'py-12 md:py-16'} ${className}`}>
    <Shell>{children}</Shell>
  </section>
)

// Bordered card — the core institutional container from the reference design.
export const Panel = ({ children, className = '', hover = false }) => (
  <div className={`rounded-xl border border-white/[0.07] bg-[#11161D]/60 ${hover ? 'hover-lift' : ''} ${className}`}>
    {children}
  </div>
)

// Section header: small gold icon + label on the left, optional action on the right.
export const SectionHead = ({ icon: Icon, label, action, href, onAction }) => (
  <div className="flex items-center justify-between gap-4 mb-4">
    <div className="flex items-center gap-2">
      {Icon && (
        <span className="h-6 w-6 rounded-md bg-gold/[0.1] border border-gold/20 flex items-center justify-center">
          <Icon className="h-3 w-3 text-gold" />
        </span>
      )}
      <span className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-neutral-300">{label}</span>
    </div>
    {action && (
      <a href={href || '#'} onClick={onAction}
        className="group text-[10.5px] uppercase tracking-[0.16em] text-gold/80 hover:text-gold transition inline-flex items-center gap-1.5">
        {action}
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </a>
    )}
  </div>
)

// Standard scroll-reveal. Uses the hardened observer+rect hook so content can
// never be stranded invisible by a dropped IntersectionObserver callback.
export const Reveal = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null)
  const shown = useRevealed(ref)
  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.5, delay: shown ? delay : 0, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const MetaPair = ({ label, value }) => (
  <div>
    <div className="text-[9px] uppercase tracking-[0.16em] text-neutral-600">{label}</div>
    <div className="mt-0.5 text-[12px] text-neutral-300">{value}</div>
  </div>
)

export const Chip = ({ children, tone = 'default' }) => (
  <span className={`text-[10.5px] px-2 py-[3px] rounded border transition ${
    tone === 'gold'
      ? 'text-gold-soft bg-gold/[0.07] border-gold/20'
      : 'text-neutral-400 bg-white/[0.02] border-white/[0.07] hover:border-white/15 hover:text-neutral-200'
  }`}>{children}</span>
)
