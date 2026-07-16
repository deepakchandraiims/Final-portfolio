'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Scale, GraduationCap, Target } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Shell, Panel } from '@/components/shared/layout'

const PRINCIPLE_ICONS = { sun: Sun, scale: Scale, learn: GraduationCap, impact: Target }

const FALLBACK_PRINCIPLES = [
  { icon: 'sun', label: 'Long Term Thinking' },
  { icon: 'scale', label: 'Integrity in Execution' },
  { icon: 'learn', label: 'Continuous Learning' },
  { icon: 'impact', label: 'Impact Over Recognition' },
]

export const Philosophy = () => {
  const { philosophy, principles } = useSite()
  const quotes = (philosophy && philosophy.length) ? philosophy : [
    { id: 'g', quote: 'The goal of investing is not to beat others at their game. The goal is to control yourself at your own game.', author: 'Benjamin Graham' },
  ]
  const items = (principles && principles.length) ? principles : FALLBACK_PRINCIPLES
  const [i, setI] = useState(0)

  useEffect(() => {
    if (quotes.length < 2) return
    // Slow rotation — museum pacing, not a carousel.
    const t = setInterval(() => setI((p) => (p + 1) % quotes.length), 9000)
    return () => clearInterval(t)
  }, [quotes.length])

  const q = quotes[i]

  return (
    <div className="relative py-6 md:py-8">
      <Shell>
        <Panel className="px-5 py-5 md:px-8 md:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_auto_1fr] gap-6 lg:gap-8 items-center">
            {/* quote */}
            <div className="flex gap-4">
              <span className="font-serif text-gold/35 text-4xl leading-[0.8] select-none shrink-0">“</span>
              <div className="min-h-[72px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.figure key={q.id || i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}>
                    <blockquote className="font-serif text-[15px] md:text-[17px] leading-[1.5] text-neutral-100/90">
                      {q.quote}
                    </blockquote>
                    <figcaption className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gold/80">— {q.author}</figcaption>
                  </motion.figure>
                </AnimatePresence>
              </div>
            </div>

            <div className="hidden lg:block w-px h-16 bg-white/[0.07]" />

            {/* principles */}
            <div className="grid grid-cols-4 gap-2">
              {items.map((p, idx) => {
                const Icon = PRINCIPLE_ICONS[p.icon] || Target
                return (
                  <motion.div key={p.label}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.06 }}
                    className="group flex flex-col items-center text-center gap-1.5">
                    <span className="h-8 w-8 rounded-lg border border-white/[0.07] bg-white/[0.02] flex items-center justify-center transition group-hover:border-gold/30 group-hover:bg-gold/[0.06]">
                      <Icon className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-gold" />
                    </span>
                    <span className="text-[9.5px] leading-tight text-neutral-500 transition group-hover:text-neutral-300">{p.label}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </Panel>
      </Shell>
    </div>
  )
}
