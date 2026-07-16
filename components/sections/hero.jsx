'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Briefcase, Calculator, Building2, Sparkles } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { MagneticButton, CountUp } from '@/components/shared/primitives'
import { Shell, Panel } from '@/components/shared/layout'

const STAT_ICONS = { pipeline: Briefcase, model: Calculator, screen: Building2, ai: Sparkles }
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

const statusDot = (status) =>
  status === 'Completed' ? 'bg-terminal' : status === 'In Progress' ? 'bg-gold' : 'bg-neutral-600'

export const Hero = ({ onOpenContact }) => {
  const { owner, expertise, trustedAcross } = useSite()
  const intel = owner?.intelligence || {}
  const stats = intel.stats || []
  const activity = intel.activity || []
  const headline = owner?.heroHeadline || 'I help companies make better capital allocation decisions.'

  // Gold highlight applies only to the phrase "capital allocation".
  const renderHeadline = () => {
    const target = 'capital allocation'
    const idx = headline.toLowerCase().indexOf(target)
    if (idx === -1) return headline
    return (
      <>
        {headline.slice(0, idx)}
        <span className="text-gold">{headline.slice(idx, idx + target.length)}</span>
        {headline.slice(idx + target.length)}
      </>
    )
  }

  return (
    <section id="top" className="relative pt-24 md:pt-28 fin-bg">
      <div className="absolute inset-0 noise-bg" />
      <div className="absolute inset-0 grid-bg opacity-60" />

      <Shell className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.08fr] gap-8 lg:gap-10 items-start">
          {/* ---------- LEFT ---------- */}
          <div className="pt-4 lg:pt-10">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.22em] text-neutral-500">
              <span className="h-1.5 w-1.5 rounded-full bg-terminal" />
              Available for senior roles · {owner?.location}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 font-serif leading-[1.08] tracking-[-0.02em] text-[34px] sm:text-[42px] lg:text-[46px]">
              {renderHeadline()}
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-5 max-w-md text-[13.5px] leading-relaxed text-neutral-500">
              {owner?.heroSummary}
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.42 }}
              className="mt-6">
              <div className="text-[9px] uppercase tracking-[0.22em] text-neutral-600">Trusted across</div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10.5px] uppercase tracking-[0.12em] text-neutral-400">
                {(trustedAcross || []).map((t, i) => (
                  <span key={t} className="flex items-center gap-2">
                    {i > 0 && <span className="text-neutral-700">·</span>}
                    <span className="transition hover:text-gold cursor-default">{t}</span>
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.52 }}
              className="mt-7 flex flex-wrap items-center gap-2.5">
              <MagneticButton onClick={() => scrollTo('transactions')}
                className="group inline-flex items-center gap-2 rounded-md bg-gold text-[#090B10] font-medium px-5 py-2.5 text-[11.5px] uppercase tracking-[0.12em] hover:bg-gold-soft transition focus-ring">
                View Transactions
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </MagneticButton>
              <MagneticButton onClick={() => scrollTo('work')}
                className="group inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[11.5px] uppercase tracking-[0.12em] text-neutral-300 border border-white/[0.12] hover:border-gold/40 hover:text-gold transition focus-ring">
                See All Projects
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </MagneticButton>
            </motion.div>
          </div>

          {/* ---------- RIGHT: portrait + profile panel ---------- */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[0.9fr_1fr] gap-3">
              {/* portrait */}
              <div className="relative rounded-xl overflow-hidden border border-white/[0.07] aspect-[4/5] min-h-[220px]">
                <Image
                  src={owner?.portraitUrl || '/portrait/deepak-hero.webp'}
                  alt={owner?.name || 'Portrait'}
                  fill sizes="(max-width: 640px) 100vw, 260px" priority
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090B10] via-transparent to-transparent opacity-70" />
              </div>

              {/* profile panel */}
              <Panel className="p-4 flex flex-col">
                <div className="text-[8.5px] uppercase tracking-[0.2em] text-gold/70">Currently</div>
                <div className="mt-1.5 text-[14px] text-neutral-100 leading-tight">{intel.currentPosition}</div>
                {intel.currentPositionSub && <div className="text-[12px] text-neutral-500">{intel.currentPositionSub}</div>}
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded bg-white/[0.05] border border-white/10 flex items-center justify-center text-[8px] text-neutral-400 overflow-hidden">
                    {intel.companyLogoUrl ? <img src={intel.companyLogoUrl} alt="" className="w-full h-full object-cover" /> : (intel.currentCompany || '·').charAt(0)}
                  </span>
                  <span className="text-[11.5px] text-neutral-300">{intel.currentCompany}</span>
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-white/[0.06]">
                  <div className="text-[8.5px] uppercase tracking-[0.2em] text-gold/70">Expertise</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(expertise || []).map((e) => (
                      <span key={e} className="text-[9.5px] px-1.5 py-[3px] rounded border border-white/[0.07] bg-white/[0.02] text-neutral-400 hover:border-gold/25 hover:text-gold-soft transition cursor-default">{e}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-white/[0.06] mt-auto">
                  <div className="text-[8.5px] uppercase tracking-[0.2em] text-gold/70">Availability</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {(owner?.location || '').split('·').map((l) => (
                      <span key={l} className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <span className="h-1 w-1 rounded-full bg-terminal" />{l.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>

            {/* stats strip */}
            <Panel className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.06]">
              {stats.map((s) => {
                const Icon = STAT_ICONS[s.icon] || Briefcase
                return (
                  <div key={s.k} className="p-3 flex items-center gap-2.5 group">
                    <span className="h-7 w-7 rounded-md bg-gold/[0.07] border border-gold/15 flex items-center justify-center shrink-0 transition group-hover:bg-gold/[0.14]">
                      <Icon className="h-3 w-3 text-gold" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-serif text-[19px] leading-none tnum text-neutral-50"><CountUp raw={s.v} /></div>
                      <div className="mt-1 text-[8.5px] uppercase tracking-[0.12em] text-neutral-600 leading-tight">{s.k}</div>
                    </div>
                  </div>
                )
              })}
            </Panel>

            {/* latest activity */}
            {activity.length > 0 && (
              <Panel className="p-4">
                <div className="text-[8.5px] uppercase tracking-[0.2em] text-gold/70">Latest Activity</div>
                <div className="mt-2.5 space-y-2">
                  {activity.map((a, i) => (
                    <motion.div key={a.label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.6 + i * 0.08 }}
                      className="flex items-center gap-2.5 text-[11.5px] group">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot(a.status)}`} />
                      <span className="flex-1 text-neutral-300 truncate group-hover:text-neutral-100 transition">{a.label}</span>
                      <span className="text-[10px] text-neutral-600 shrink-0 hidden sm:inline">{a.status}</span>
                      <span className="text-[10px] text-neutral-600 shrink-0 font-mono">{a.date}</span>
                    </motion.div>
                  ))}
                </div>
                <button onClick={() => scrollTo('transactions')}
                  className="mt-3 text-[9px] uppercase tracking-[0.18em] text-gold/70 hover:text-gold transition inline-flex items-center gap-1.5 group focus-ring rounded">
                  View all activity <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </Panel>
            )}
          </motion.div>
        </div>
      </Shell>
    </section>
  )
}
