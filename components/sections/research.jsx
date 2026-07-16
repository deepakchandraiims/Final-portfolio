'use client'

import { motion } from 'framer-motion'
import { FileText, ArrowUpRight, Download, BookOpen } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead, Chip } from '@/components/shared/layout'

const readTime = (r) => r.readingMinutes || Math.max(3, Math.ceil((r.summary || '').length / 90))

export const Research = () => {
  const { research } = useSite()
  if (!research?.length) return null

  return (
    <>
      <span id="research" aria-hidden="true" className="block" />
    <Section id="insights">
      <SectionHead icon={BookOpen} label="Insights & Research" action="View all insights" href="#insights" />
      <Panel className="divide-y divide-white/[0.06]">
        {research.map((r, i) => {
          const href = r.link || r.fileUrl
          const Wrap = href ? 'a' : 'div'
          const props = href ? { href, target: '_blank', rel: 'noreferrer' } : {}
          return (
            <motion.div key={r.id}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}>
              <Wrap {...props} className="group flex items-start gap-4 p-4 hover:bg-white/[0.02] transition block focus-ring rounded">
                <span className="h-8 w-8 rounded-md bg-white/[0.03] border border-white/[0.07] flex items-center justify-center text-neutral-600 group-hover:text-gold group-hover:border-gold/25 transition shrink-0">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[9px] uppercase tracking-[0.16em] text-gold/70">{r.type}</span>
                    <span className="text-[9.5px] font-mono text-neutral-700">{r.date}</span>
                    <span className="text-[9.5px] text-neutral-700">· {readTime(r)} min read</span>
                  </div>
                  <div className="mt-1 text-[14px] text-neutral-100 leading-snug group-hover:text-gold transition">{r.title}</div>
                  <div className="mt-1 text-[11.5px] text-neutral-500 leading-relaxed line-clamp-2 max-w-2xl">{r.summary}</div>
                  {r.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.tags.map((t) => <Chip key={t}>{t}</Chip>)}
                    </div>
                  )}
                </div>
                {href && (
                  <span className="text-neutral-700 group-hover:text-gold transition shrink-0 mt-1">
                    {r.fileUrl && !r.link ? <Download className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                )}
              </Wrap>
            </motion.div>
          )
        })}
      </Panel>
    </Section>
    </>
  )
}
