'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BadgeCheck, ExternalLink, Award } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead } from '@/components/shared/layout'

/* Subtle 3D tilt — a few degrees only. Institutional, not toy-like. */
const TiltCard = ({ c, i }) => {
  const ref = useRef(null)
  const [t, setT] = useState({ rx: 0, ry: 0 })

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setT({ rx: -py * 5, ry: px * 5 })
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.45, delay: i * 0.05 }}
      onMouseMove={onMove}
      onMouseLeave={() => setT({ rx: 0, ry: 0 })}
      style={{ transform: `perspective(700px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`, transformStyle: 'preserve-3d' }}
      className="group rounded-lg border border-white/[0.07] bg-[#11161D]/60 p-4 flex flex-col transition-[border-color,box-shadow] duration-300 hover:border-gold/25 hover:shadow-[0_16px_40px_-16px_rgba(200,167,106,0.18)]"
    >
      <div className="text-[9px] uppercase tracking-[0.14em] text-neutral-600 truncate">{c.provider}</div>
      <div className="mt-1.5 text-[12.5px] leading-snug text-neutral-100 min-h-[34px]">{c.name}</div>

      <div className="mt-4 flex-1 flex items-center justify-center py-3">
        {c.imageUrl ? (
          <img src={c.imageUrl} alt={c.name} className="max-h-[38px] object-contain opacity-90 group-hover:opacity-100 transition" />
        ) : (
          <span className="h-9 w-9 rounded-lg bg-gold/[0.07] border border-gold/20 flex items-center justify-center transition group-hover:bg-gold/[0.14]">
            <Award className="h-4 w-4 text-gold" />
          </span>
        )}
      </div>

      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[9.5px] font-mono text-neutral-600">{c.issued}</span>
        {c.verifyUrl ? (
          <a href={c.verifyUrl} target="_blank" rel="noreferrer"
            className="text-[9px] uppercase tracking-[0.14em] text-gold/70 hover:text-gold transition inline-flex items-center gap-1 focus-ring rounded">
            View credential <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ) : (
          <span className="text-[9px] uppercase tracking-[0.14em] text-neutral-700 inline-flex items-center gap-1">
            <BadgeCheck className="h-2.5 w-2.5" /> Verified
          </span>
        )}
      </div>
    </motion.div>
  )
}

export const Certifications = () => {
  const { certifications } = useSite()
  if (!certifications?.length) return null
  return (
    <Section id="certificates">
      <SectionHead icon={BadgeCheck} label="Certifications" action="View all certificates" href="#certificates" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {certifications.slice(0, 5).map((c, i) => <TiltCard key={c.id} c={c} i={i} />)}
      </div>
    </Section>
  )
}
