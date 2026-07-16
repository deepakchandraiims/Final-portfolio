'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Play, Pause, Briefcase, GraduationCap, Award, Mail, Download } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'

const AUTOPLAY_MS = 7000

/* ------------------------------- slides ------------------------------- */

const SlideShell = ({ kicker, title, children }) => (
  <div className="w-full max-w-4xl mx-auto">
    <div className="text-[10px] uppercase tracking-[0.28em] text-gold/80">{kicker}</div>
    <h2 className="mt-3 font-serif text-[30px] md:text-[44px] leading-[1.06] tracking-[-0.02em] text-neutral-50">{title}</h2>
    <div className="mt-7">{children}</div>
  </div>
)

const CurrentRoleSlide = ({ owner }) => {
  const intel = owner?.intelligence || {}
  return (
    <SlideShell kicker="Currently" title={`${intel.currentPosition || owner?.currentRole}${intel.currentPositionSub ? ' · ' + intel.currentPositionSub : ''}`}>
      <div className="flex items-center gap-2.5">
        <span className="h-7 w-7 rounded-md bg-white/[0.05] border border-white/10 flex items-center justify-center text-[11px] text-neutral-300">
          {(intel.currentCompany || '·').charAt(0)}
        </span>
        <span className="text-[16px] text-neutral-200">{intel.currentCompany}</span>
      </div>
      <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-neutral-400">{owner?.heroSummary || owner?.tagline}</p>
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(intel.stats || []).map((s) => (
          <div key={s.k} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="font-serif text-2xl tnum text-neutral-50">{s.v}</div>
            <div className="mt-1.5 text-[9px] uppercase tracking-[0.14em] text-neutral-600 leading-tight">{s.k}</div>
          </div>
        ))}
      </div>
      {(intel.activity || []).length > 0 && (
        <div className="mt-6">
          <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">Recent work</div>
          <div className="mt-2.5 space-y-1.5">
            {intel.activity.map((a) => (
              <div key={a.label} className="flex items-center gap-2.5 text-[13px]">
                <span className={`h-1.5 w-1.5 rounded-full ${a.status === 'Completed' ? 'bg-terminal' : 'bg-gold'}`} />
                <span className="text-neutral-300">{a.label}</span>
                <span className="text-[11px] text-neutral-600 font-mono ml-auto">{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SlideShell>
  )
}

const EducationSlide = ({ education }) => (
  <SlideShell kicker="Education" title="Where the rigour started.">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {(education || []).map((e) => (
        <div key={e.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="flex items-start gap-3">
            <span className="h-9 w-9 rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
              {e.logoUrl ? <img src={e.logoUrl} alt="" className="w-full h-full object-cover" /> : <GraduationCap className="h-4 w-4 text-gold/70" />}
            </span>
            <div className="min-w-0">
              <div className="font-serif text-lg leading-tight text-neutral-50">{e.degree}</div>
              <div className="text-[13px] text-neutral-400 mt-0.5">{e.field}</div>
              <div className="text-[12px] text-neutral-500 mt-1">{e.institution}</div>
              <div className="text-[10px] font-mono text-neutral-600 mt-1">{e.start}—{e.end}</div>
            </div>
          </div>
          {(e.achievements || []).length > 0 && (
            <div className="mt-3.5 pt-3.5 border-t border-white/[0.06] space-y-1">
              {e.achievements.slice(0, 3).map((a) => (
                <div key={a} className="flex items-start gap-1.5 text-[12px] text-neutral-400">
                  <Award className="h-3 w-3 text-gold/60 mt-0.5 shrink-0" />{a}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </SlideShell>
)

const ExperienceSlide = ({ experience }) => (
  <SlideShell kicker="Experience" title="Where I've built.">
    <div className="space-y-2.5">
      {(experience || []).slice(0, 4).map((e) => (
        <div key={`${e.company}-${e.role}`} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-4">
          <span className="h-8 w-8 rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
            <Briefcase className="h-3.5 w-3.5 text-gold/70" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div className="text-[14.5px] text-neutral-100">{e.role}</div>
              <div className="text-[10px] font-mono text-neutral-600">{e.period}</div>
            </div>
            <div className="text-[12.5px] text-gold/70 mt-0.5">{e.company}</div>
            {(e.bullets || []).length > 0 && (
              <div className="mt-1.5 text-[12px] text-neutral-500 leading-relaxed line-clamp-2">{e.bullets[0]}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  </SlideShell>
)

const SkillsSlide = ({ skills }) => (
  <SlideShell kicker="Skills & Tools" title="The stack.">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {(skills || []).map((g) => (
        <div key={g.group} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="text-[9px] uppercase tracking-[0.16em] text-gold/70">{g.group}</div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(g.items || []).slice(0, 9).map((s) => (
              <span key={s} className="text-[11px] px-2 py-[3px] rounded border border-white/[0.07] bg-white/[0.02] text-neutral-400">{s}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </SlideShell>
)

const ClosingSlide = ({ owner, onContact }) => (
  <SlideShell kicker="Let's connect" title="Let's build something exceptional.">
    <p className="max-w-2xl text-[15px] leading-relaxed text-neutral-400">{owner?.availability}</p>
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <button onClick={onContact}
        className="inline-flex items-center gap-2 rounded-md bg-gold text-[#090B10] font-medium px-5 py-2.5 text-[11.5px] uppercase tracking-[0.12em] hover:bg-gold-soft transition focus-ring">
        <Mail className="h-3.5 w-3.5" /> Get in touch
      </button>
      {owner?.resumeUrl && (
        <a href={owner.resumeUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[11.5px] uppercase tracking-[0.12em] text-neutral-300 border border-white/[0.12] hover:border-gold/40 hover:text-gold transition focus-ring">
          <Download className="h-3.5 w-3.5" /> Résumé
        </a>
      )}
    </div>
  </SlideShell>
)

/* ----------------------------- slideshow ----------------------------- */

export const RecruiterSlideshow = ({ open, onClose, onOpenContact }) => {
  const { owner, education, experience, skills } = useSite()
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)

  const slides = useMemo(() => ([
    { id: 'role', label: 'Current Role', node: <CurrentRoleSlide owner={owner} /> },
    { id: 'education', label: 'Education', node: <EducationSlide education={education} /> },
    { id: 'experience', label: 'Experience', node: <ExperienceSlide experience={experience} /> },
    { id: 'skills', label: 'Skills', node: <SkillsSlide skills={skills} /> },
    { id: 'contact', label: 'Contact', node: <ClosingSlide owner={owner} onContact={() => { onClose(); onOpenContact?.() }} /> },
  ]), [owner, education, experience, skills, onClose, onOpenContact])

  const next = useCallback(() => setI((p) => (p + 1) % slides.length), [slides.length])
  const prev = useCallback(() => setI((p) => (p - 1 + slides.length) % slides.length), [slides.length])

  // reset on open
  useEffect(() => { if (open) { setI(0); setPlaying(true) } }, [open])

  // autoplay
  useEffect(() => {
    if (!open || !playing) return
    const t = setInterval(next, AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [open, playing, next])

  // keyboard + scroll lock
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') { setPlaying(false); next() }
      if (e.key === 'ArrowLeft') { setPlaying(false); prev() }
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [open, next, prev, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog" aria-modal="true" aria-label="Recruiter overview"
          className="fixed inset-0 z-[100] bg-[#090B10] fin-bg overflow-hidden">
          <div className="absolute inset-0 noise-bg" />
          <div className="absolute inset-0 grid-bg opacity-40" />

          {/* progress segments */}
          <div className="absolute top-0 inset-x-0 z-20 flex gap-1 p-3">
            {slides.map((s, idx) => (
              <button key={s.id} onClick={() => { setPlaying(false); setI(idx) }}
                aria-label={`Go to ${s.label}`}
                className="flex-1 h-[3px] rounded-full bg-white/[0.08] overflow-hidden focus-ring">
                <motion.div
                  className="h-full bg-gold"
                  initial={false}
                  animate={{ width: idx < i ? '100%' : idx === i ? '100%' : '0%' }}
                  transition={idx === i && playing
                    ? { duration: AUTOPLAY_MS / 1000, ease: 'linear' }
                    : { duration: 0.25 }}
                  key={`${idx}-${i}-${playing}`}
                />
              </button>
            ))}
          </div>

          {/* header */}
          <div className="absolute top-5 inset-x-0 z-20 px-5 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">Recruiter view</span>
              <span className="text-[10px] font-mono text-neutral-700">{String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}
                className="h-8 w-8 rounded-md border border-white/[0.1] hover:bg-white/[0.05] flex items-center justify-center text-neutral-400 hover:text-neutral-100 transition focus-ring">
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button onClick={onClose} aria-label="Close recruiter view"
                className="h-8 w-8 rounded-md border border-white/[0.1] hover:bg-white/[0.05] flex items-center justify-center text-neutral-400 hover:text-neutral-100 transition focus-ring">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* slide body */}
          <div className="relative z-10 h-full flex items-center px-5 md:px-16 py-20 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={slides[i].id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full">
                {slides[i].node}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* nav arrows */}
          <button onClick={() => { setPlaying(false); prev() }} aria-label="Previous"
            className="absolute left-2 md:left-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full border border-white/[0.1] bg-[#11161D]/70 backdrop-blur flex items-center justify-center text-neutral-400 hover:text-gold hover:border-gold/30 transition focus-ring">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => { setPlaying(false); next() }} aria-label="Next"
            className="absolute right-2 md:right-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full border border-white/[0.1] bg-[#11161D]/70 backdrop-blur flex items-center justify-center text-neutral-400 hover:text-gold hover:border-gold/30 transition focus-ring">
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* footer labels */}
          <div className="absolute bottom-0 inset-x-0 z-20 px-5 md:px-8 py-4 flex items-center justify-center gap-1 flex-wrap">
            {slides.map((s, idx) => (
              <button key={s.id} onClick={() => { setPlaying(false); setI(idx) }}
                className={`px-2.5 py-1 rounded text-[9.5px] uppercase tracking-[0.14em] transition focus-ring ${
                  idx === i ? 'text-gold bg-gold/[0.08]' : 'text-neutral-600 hover:text-neutral-300'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
