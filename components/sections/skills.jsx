'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead, Chip } from '@/components/shared/layout'
import { ToolIcon } from '@/components/shared/tool-icons'

const Bar = ({ label, value, delay }) => (
  <div className="group">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11.5px] text-neutral-400 group-hover:text-neutral-200 transition">{label}</span>
      <span className="text-[10px] font-mono text-neutral-600 tnum">{value}%</span>
    </div>
    <div className="mt-1.5 h-[3px] w-full rounded-full bg-white/[0.05] overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold"
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  </div>
)

export const SkillsSection = () => {
  const { skillBars, tools, financeExpertise } = useSite()
  const [showAllTools, setShowAllTools] = useState(false)
  const toolList = tools || []
  const visibleTools = showAllTools ? toolList : toolList.slice(0, 8)

  return (
    <Section id="skills">
      <SectionHead icon={Layers} label="Skills & Tools" />
      <Panel className="p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* technical skills — proficiency */}
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-gold/70">Technical Skills</div>
            <div className="mt-4 space-y-3.5">
              {(skillBars || []).map((b, i) => (
                <Bar key={b.label} label={b.label} value={b.value} delay={i * 0.06} />
              ))}
            </div>
          </div>

          {/* tools & software */}
          <div className="lg:border-x lg:border-white/[0.06] lg:px-8">
            <div className="text-[9px] uppercase tracking-[0.2em] text-gold/70">Tools & Software</div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {visibleTools.map((t, i) => (
                <motion.div key={t.key}
                  initial={{ opacity: 0, scale: 0.94 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  title={t.label}
                  className="group rounded-lg border border-white/[0.06] bg-white/[0.015] p-2 flex flex-col items-center gap-1.5 cursor-default transition hover:border-white/15 hover:bg-white/[0.04] hover:-translate-y-0.5">
                  <ToolIcon toolKey={t.key} logoUrl={t.logoUrl} label={t.label} size={30} />
                  <span className="text-[8.5px] text-neutral-600 group-hover:text-neutral-300 transition text-center leading-tight truncate w-full">{t.label}</span>
                </motion.div>
              ))}
            </div>
            {toolList.length > 8 && (
              <button onClick={() => setShowAllTools((v) => !v)}
                className="mt-3 text-[9px] uppercase tracking-[0.16em] text-gold/70 hover:text-gold transition focus-ring rounded">
                {showAllTools ? 'Show less' : `+${toolList.length - 8} more`}
              </button>
            )}
          </div>

          {/* finance expertise */}
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-gold/70">Finance Expertise</div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(financeExpertise || []).map((f) => (
                <Chip key={f}>{f}</Chip>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </Section>
  )
}
