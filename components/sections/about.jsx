'use client'

import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead } from '@/components/shared/layout'

/* Narrative + operating principles.
   Renders `chapters` from the CMS (the old Chapters section is folded in here,
   so the admin's Chapters editor still drives live content). */
export const About = () => {
  const { owner, chapters } = useSite()
  const why = chapters?.[0]
  const how = chapters?.[1]
  const principles = how?.principles || []

  return (
    <Section id="about">
      <SectionHead icon={User} label="About" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-4">
        <Panel className="p-5 md:p-6">
          {why?.kicker && <div className="text-[9px] uppercase tracking-[0.2em] text-gold/70">{why.kicker}</div>}
          <h2 className="mt-2 font-serif text-[24px] md:text-[30px] leading-[1.14] tracking-[-0.02em] text-neutral-50">
            {why?.title || 'I build the analysis that decisions can stand on.'}
          </h2>
          <div className="mt-4 space-y-3 text-[12.5px] leading-relaxed text-neutral-500">
            <p>{why?.body || owner?.bio}</p>
            {why?.body && owner?.bio && <p>{owner.bio}</p>}
          </div>
        </Panel>

        <Panel className="p-5 md:p-6">
          {how?.kicker && <div className="text-[9px] uppercase tracking-[0.2em] text-gold/70">{how.kicker}</div>}
          <div className="mt-2 font-serif text-[19px] leading-snug text-neutral-100">{how?.title || 'How I work'}</div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {principles.map((p, i) => (
              <motion.div key={p.t}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }} transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3.5 transition hover:border-gold/20">
                <div className="flex items-start gap-2">
                  <span className="text-gold/50 text-[9px] font-mono mt-[3px]">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <div className="text-[12px] text-neutral-100 leading-snug">{p.t}</div>
                    <div className="mt-1 text-[11px] text-neutral-500 leading-relaxed">{p.d}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Panel>
      </div>
    </Section>
  )
}
