'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Download, Lock, ArrowUpDown } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead, Chip } from '@/components/shared/layout'

const complexityTone = (c) =>
  c === 'Advanced' ? 'text-gold-soft border-gold/25 bg-gold/[0.07]'
  : c === 'Intermediate' ? 'text-terminal-soft border-terminal/25 bg-terminal/[0.06]'
  : 'text-neutral-400 border-white/10 bg-white/[0.03]'

/*
 * Rendered as a real <table>, not a stack of CSS grids.
 *
 * The previous version gave every row its own `grid-cols-[1.7fr_0.7fr_...]`
 * container. Grid tracks only resolve within a single container, so each row
 * sized its columns from its own content and nothing lined up — measured:
 * header col at x=486 against rows at x=491 and x=518. A table shares one
 * column model across every row, so alignment is structural, not coincidental.
 */

const COLS = [
  { k: 'name', label: 'Model', w: 'w-[32%]' },
  { k: 'type', label: 'Type', w: 'w-[10%]' },
  { k: 'subject', label: 'Subject', w: 'w-[20%]' },
  { k: 'year', label: 'Year', w: 'w-[8%]', num: true },
  { k: 'complexity', label: 'Complexity', w: 'w-[13%]' },
  { k: 'tools', label: 'Tools', w: 'w-[17%]' },
]

export const Models = () => {
  const { models } = useSite()
  const [sort, setSort] = useState({ k: 'year', dir: 'desc' })

  const rows = useMemo(() => {
    const list = [...(models || [])]
    const dir = sort.dir === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      const x = a[sort.k], y = b[sort.k]
      if (x === undefined || x === null) return 1
      if (y === undefined || y === null) return -1
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir
    })
  }, [models, sort])

  if (!models?.length) return null

  const setKey = (k) => setSort((s) => ({ k, dir: s.k === k && s.dir === 'desc' ? 'asc' : 'desc' }))

  return (
    <Section id="models">
      <SectionHead icon={Calculator} label="Models" action={`${models.length} built`} href="#models" />
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[760px] table-fixed border-collapse">
            <colgroup>
              {COLS.map((c) => <col key={c.k} className={c.w} />)}
              <col className="w-[70px]" />
            </colgroup>

            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                {COLS.map((c) => (
                  <th key={c.k} scope="col" className={`px-3 py-2.5 ${c.num ? 'text-right' : 'text-left'}`}>
                    <button
                      onClick={() => setKey(c.k)}
                      className={`inline-flex items-center gap-1 text-[8.5px] uppercase tracking-[0.14em] transition focus-ring rounded ${
                        sort.k === c.k ? 'text-gold' : 'text-neutral-600 hover:text-neutral-300'
                      }`}
                    >
                      {c.label}
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-right">
                  <span className="text-[8.5px] uppercase tracking-[0.14em] text-neutral-600">File</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.05]">
              {rows.map((m, i) => (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="group hover:bg-white/[0.02] transition align-top"
                >
                  <td className="px-3 py-3">
                    <div className="text-[12.5px] text-neutral-100 leading-snug group-hover:text-gold transition truncate">
                      {m.name}
                    </div>
                    <div className="text-[10.5px] text-neutral-600 mt-0.5 truncate">{m.note}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10.5px] font-mono text-gold/75 whitespace-nowrap">{m.type}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10.5px] text-neutral-400 block truncate">{m.subject}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-[10.5px] font-mono text-neutral-600 tnum">{m.year}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block text-[8.5px] uppercase tracking-[0.1em] px-1.5 py-[2px] rounded border whitespace-nowrap ${complexityTone(m.complexity)}`}>
                      {m.complexity}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(m.tools || []).slice(0, 2).map((t) => <Chip key={t}>{t}</Chip>)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      {m.fileUrl ? (
                        <a href={m.fileUrl} target="_blank" rel="noreferrer" title="Download model"
                          className="h-6 w-6 rounded border border-white/[0.08] flex items-center justify-center text-neutral-500 hover:text-gold hover:border-gold/30 transition focus-ring">
                          <Download className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <span title="Available on request"
                          className="h-6 w-6 rounded border border-white/[0.06] flex items-center justify-center text-neutral-700">
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="mt-2.5 text-[10.5px] text-neutral-700">
        Client-identifying models are anonymised or withheld; sanitised walkthroughs available on request.
      </p>
    </Section>
  )
}
