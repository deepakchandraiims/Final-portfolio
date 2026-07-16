'use client'

import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Briefcase, GraduationCap, ChevronDown, Award, BookOpen } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead, Chip } from '@/components/shared/layout'

/* Timeline rail that draws itself as the column scrolls into view. */
const Rail = ({ progress }) => (
  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/[0.07]">
    <motion.div className="w-full bg-gradient-to-b from-gold via-gold/50 to-transparent origin-top"
      style={{ scaleY: progress, height: '100%' }} />
  </div>
)

const Node = ({ current }) => (
  <span className="absolute left-0 top-1.5 z-10">
    <span className={`block h-[11px] w-[11px] rounded-full border-2 ${
      current ? 'border-gold bg-[#090B10]' : 'border-white/20 bg-[#090B10]'
    }`} />
    {current && <span className="absolute inset-0 rounded-full bg-gold/25 animate-ping" style={{ animationDuration: '2.4s' }} />}
  </span>
)

const ExperienceRow = ({ e, current, expanded, onToggle }) => (
  <div className="relative pl-6 pb-5 last:pb-0">
    <Node current={current} />
    <button onClick={onToggle} aria-expanded={expanded}
      className="w-full text-left group focus-ring rounded">
      <div className="flex items-start gap-3">
        <span className="text-[9.5px] font-mono text-neutral-600 pt-0.5 w-[74px] shrink-0">{e.period}</span>
        <span className="h-6 w-6 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden text-[9px] text-neutral-400">
          {e.logoUrl ? <img src={e.logoUrl} alt="" className="w-full h-full object-cover" /> : (e.company || '·').charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] text-neutral-100 leading-snug group-hover:text-gold transition">{e.role}</span>
          <span className="block text-[11px] text-neutral-500 mt-0.5">{e.company}{e.location ? ` · ${e.location}` : ''}</span>
        </span>
        <ChevronDown className={`h-3 w-3 text-neutral-600 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>
    </button>

    {!expanded && (e.bullets || []).length > 0 && (
      <p className="mt-1.5 ml-[100px] text-[11px] leading-relaxed text-neutral-500 line-clamp-2">{e.bullets[0]}</p>
    )}

    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden">
          <div className="ml-[100px] mt-2 space-y-1.5">
            {(e.bullets || []).map((b, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-400">
                <span className="text-gold/50 mt-[3px] text-[8px]">▪</span>{b}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {(e.skills || e.tags || []).length > 0 && (
      <div className="ml-[100px] mt-2 flex flex-wrap gap-1">
        {(e.skills || e.tags).slice(0, 4).map((s) => <Chip key={s}>{s}</Chip>)}
      </div>
    )}
  </div>
)

const EducationRow = ({ e, expanded, onToggle }) => (
  <div className="relative pl-6 pb-5 last:pb-0">
    <Node />
    <button onClick={onToggle} aria-expanded={expanded} className="w-full text-left group focus-ring rounded">
      <div className="flex items-start gap-3">
        <span className="text-[9.5px] font-mono text-neutral-600 pt-0.5 w-[74px] shrink-0">{e.start} – {e.end}</span>
        <span className="h-6 w-6 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden">
          {e.logoUrl ? <img src={e.logoUrl} alt="" className="w-full h-full object-cover" /> : <GraduationCap className="h-3 w-3 text-gold/60" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] text-neutral-100 leading-snug group-hover:text-gold transition">{e.degree}</span>
          <span className="block text-[11px] text-neutral-500 mt-0.5">{e.field}</span>
          <span className="block text-[10.5px] text-neutral-600 mt-0.5">{e.institution}</span>
        </span>
        <ChevronDown className={`h-3 w-3 text-neutral-600 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>
    </button>

    <div className="ml-[100px] mt-2 flex flex-wrap gap-1">
      {e.cgpa && <Chip tone="gold">CGPA: {e.cgpa}</Chip>}
      {(e.awards || []).slice(0, 1).map((a) => <Chip key={a}>{a}</Chip>)}
    </div>

    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
          <div className="ml-[100px] mt-2.5 space-y-2">
            {(e.achievements || []).length > 0 && (
              <div className="space-y-1">
                {e.achievements.map((a) => (
                  <div key={a} className="flex items-start gap-1.5 text-[11px] text-neutral-400">
                    <Award className="h-2.5 w-2.5 text-gold/60 mt-1 shrink-0" />{a}
                  </div>
                ))}
              </div>
            )}
            {(e.coursework || []).length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-[8.5px] uppercase tracking-[0.16em] text-neutral-600">
                  <BookOpen className="h-2.5 w-2.5" /> Coursework
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {e.coursework.map((c) => <Chip key={c}>{c}</Chip>)}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)

/* Work Experience + Education, side by side — replaces two stacked sections. */
export const CareerSection = () => {
  const { experience, education } = useSite()
  const expRef = useRef(null)
  const eduRef = useRef(null)
  const [openExp, setOpenExp] = useState(null)
  const [openEdu, setOpenEdu] = useState(null)

  const { scrollYProgress: expP } = useScroll({ target: expRef, offset: ['start 85%', 'end 55%'] })
  const { scrollYProgress: eduP } = useScroll({ target: eduRef, offset: ['start 85%', 'end 55%'] })
  const expScale = useTransform(expP, [0, 1], [0, 1])
  const eduScale = useTransform(eduP, [0, 1], [0, 1])

  return (
    <Section id="experience">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* work experience */}
        <div>
          <SectionHead icon={Briefcase} label="Work Experience" action="View full experience" href="#experience" />
          <Panel className="p-5">
            <div ref={expRef} className="relative">
              <Rail progress={expScale} />
              {(experience || []).map((e, i) => (
                <ExperienceRow key={`${e.company}-${e.role}`} e={e} current={i === 0}
                  expanded={openExp === i} onToggle={() => setOpenExp(openExp === i ? null : i)} />
              ))}
            </div>
          </Panel>
        </div>

        {/* education */}
        <div id="education">
          <SectionHead icon={GraduationCap} label="Education" action="View full education" href="#education" />
          <Panel className="p-5">
            <div ref={eduRef} className="relative">
              <Rail progress={eduScale} />
              {(education || []).map((e, i) => (
                <EducationRow key={e.id} e={e}
                  expanded={openEdu === i} onToggle={() => setOpenEdu(openEdu === i ? null : i)} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Section>
  )
}
