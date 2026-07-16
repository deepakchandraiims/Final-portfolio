'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Download, Sparkles, Clock, TrendingUp, Target, Layers, BarChart3, LineChart, Brain, Briefcase, Check, Paperclip, Eye, Download as DownloadIcon, FolderKanban } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSite } from '@/components/shared/site-context'
import { Section, Panel, SectionHead, Chip, MetaPair } from '@/components/shared/layout'
import { CATEGORY_META, formatBytes, previewUrl } from '@/lib/file-utils'

const categoryIcon = (c) => {
  const map = {
    'M&A': Briefcase, 'Valuation': LineChart, 'Corporate Strategy': Target,
    'AI Automation': Brain, 'Dashboards': BarChart3, 'Market Research': TrendingUp,
  }
  return map[c] || Layers
}

/* Project card — photo thumbnail, category, title, INDUSTRY/GEOGRAPHY, tools. */
const ProjectCard = ({ p, onOpen, i = 0 }) => {
  const Icon = categoryIcon(p.category)
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.42, delay: (i % 4) * 0.05 }}
      onClick={() => onOpen(p)}
      className="group text-left rounded-xl border border-white/[0.07] bg-[#11161D]/60 overflow-hidden flex flex-col transition-all duration-300 hover:border-gold/25 hover:-translate-y-1 hover:shadow-[0_20px_45px_-20px_rgba(0,0,0,0.85)] focus-ring"
    >
      {/* thumbnail — real image when set, gradient fallback otherwise */}
      <div className="relative h-[104px] overflow-hidden bg-[#0C1118]">
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-700"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${p.accent || 'from-neutral-800 to-neutral-900'}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#11161D] via-[#11161D]/25 to-transparent" />
        <span className="absolute top-2 right-2 h-6 w-6 rounded-md bg-[#090B10]/75 border border-white/10 flex items-center justify-center backdrop-blur-sm">
          <Icon className="h-3 w-3 text-gold/80" />
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[8.5px] uppercase tracking-[0.16em] text-gold/80 truncate">{p.category}</div>
        <div className="mt-1.5 font-serif text-[14.5px] leading-[1.3] text-neutral-50 line-clamp-2 min-h-[38px] group-hover:text-gold transition-colors">
          {p.title}
        </div>

        {/* INDUSTRY / GEOGRAPHY — the reference's two-column meta rail */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 pb-3.5 border-b border-white/[0.06]">
          <MetaPair label="Industry" value={p.industry || '—'} />
          <MetaPair label={p.geography ? 'Geography' : 'Year'} value={p.geography || p.year || '—'} />
        </div>

        <p className="mt-3.5 text-[11px] leading-relaxed text-neutral-500 line-clamp-2">{p.impact || p.executiveSummary}</p>

        <div className="mt-3.5 flex flex-wrap gap-1">
          {(p.tools || []).slice(0, 3).map((t) => <Chip key={t}>{t}</Chip>)}
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between mt-auto">
          <span className="text-[9px] uppercase tracking-[0.14em] text-gold/80 group-hover:text-gold transition inline-flex items-center gap-1.5">
            View project <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </motion.button>
  )
}

export const Projects = ({ onOpenProject }) => {
  const { projects, categories } = useSite()
  const [filter, setFilter] = useState('All')
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(
    () => (projects || []).filter((p) => filter === 'All' || p.category === filter),
    [projects, filter]
  )
  // Default view stays tight: featured only. "View all" expands in place.
  const featured = useMemo(() => {
    const f = filtered.filter((p) => p.featured)
    return (f.length ? f : filtered).slice(0, 4)
  }, [filtered])
  const visible = showAll || filter !== 'All' ? filtered : featured

  return (
    <Section id="work">
      <SectionHead
        icon={FolderKanban}
        label={showAll || filter !== 'All' ? 'All Projects' : 'Featured Projects'}
        action={showAll ? 'Show featured only' : `View all projects (${(projects || []).length})`}
        onAction={(e) => { e.preventDefault(); setShowAll((v) => !v); setFilter('All') }}
      />

      {/* filters */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {(categories || ['All']).map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-2.5 py-1 rounded text-[9.5px] uppercase tracking-[0.12em] border transition focus-ring ${
              filter === c
                ? 'bg-gold/[0.1] border-gold/30 text-gold'
                : 'bg-white/[0.02] border-white/[0.07] text-neutral-500 hover:text-neutral-200 hover:border-white/15'
            }`}>
            {c}
          </button>
        ))}
      </div>

      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {visible.map((p, i) => (
            <ProjectCard key={p.id} p={p} i={i} onOpen={onOpenProject} />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* page indicator — mirrors the reference's carousel dots */}
      {!showAll && filter === 'All' && (projects || []).length > featured.length && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: Math.min(5, Math.ceil((projects || []).length / 4)) }).map((_, d) => (
            <button key={d} onClick={() => setShowAll(true)} aria-label={`Page ${d + 1}`}
              className={`h-1.5 rounded-full transition-all focus-ring ${d === 0 ? 'w-4 bg-gold' : 'w-1.5 bg-white/15 hover:bg-white/30'}`} />
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <div className="py-12 text-center text-[12px] text-neutral-600">No projects in this category.</div>
      )}
    </Section>
  )
}

export const CaseStudyDialog = ({ project, open, onClose, onOpenAnother }) => {
  const { projects } = useSite()
  const [attachedFiles, setAttachedFiles] = useState([])
  useEffect(() => {
    if (!open || !project) { setAttachedFiles([]); return }
    let cancelled = false
    fetch(`/api/files?projectId=${encodeURIComponent(project.id)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled && Array.isArray(data)) setAttachedFiles(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, project])
  if (!project) return null
  const related = (projects || []).filter((p) => p.id !== project.id && p.category === project.category && !p.hidden).slice(0, 2)
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl p-0 gap-0 bg-neutral-950 border-white/10 max-h-[92vh] overflow-y-auto no-scrollbar">
        <div className="relative">
          <div className={`aspect-[21/8] w-full ${project.coverImageUrl ? '' : `bg-gradient-to-br ${project.accent}`} relative overflow-hidden`}>
            {project.coverImageUrl ? (
              <>
                <img src={project.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 grid-bg opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="font-serif text-[280px] text-white/[0.08] leading-none select-none">{project.coverEmoji}</div>
                </div>
              </>
            )}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="glass rounded-full px-2.5 py-1 text-[10px] flex items-center gap-1.5">{categoryIcon(project.category)} {project.category}</div>
              <div className="glass rounded-full px-2.5 py-1 text-[10px]">{project.industry}</div>
              <div className="glass rounded-full px-2.5 py-1 text-[10px]">{project.year}</div>
            </div>
          </div>
        </div>
        <div className="p-8 md:p-12">
          <DialogHeader className="text-left space-y-3">
            <DialogTitle className="font-serif text-3xl md:text-5xl tracking-tight leading-[1.05]">{project.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-neutral-400">
            <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {project.readingMinutes} min read</div>
            <span className="h-1 w-1 rounded-full bg-neutral-700" />
            <div className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> {project.impact}</div>
          </div>
          {(project.metrics || []).length > 0 && (
            <div className="mt-8 grid grid-cols-3 gap-4 p-5 rounded-xl bg-white/[0.02] border border-white/5">
              {project.metrics.map((m) => (
                <div key={m.k}>
                  <div className="font-serif text-2xl md:text-3xl">{m.v}</div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">{m.k}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 p-5 rounded-xl border border-gold/20 bg-gold/[0.04]">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-gold-soft">
              <Sparkles className="h-3.5 w-3.5" /> Recruiter summary
            </div>
            <p className="mt-3 text-[15px] text-neutral-200 leading-relaxed">{project.executiveSummary}</p>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Situation &amp; objective</div>
              <p className="mt-3 text-[14px] text-neutral-300 leading-relaxed">{project.problem}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Deliverables</div>
              <ul className="mt-3 space-y-1.5">
                {(project.deliverables || []).map((d) => (
                  <li key={d} className="text-[14px] text-neutral-300 flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">Tools &amp; platforms</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(project.tools || []).map((t) => (
                  <span key={t} className="text-[12px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10">{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Methodology &amp; analysis</div>
            <ol className="mt-4 space-y-3">
              {(project.approach || []).map((a, i) => (
                <li key={i} className="flex gap-4">
                  <div className="mt-1 h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-mono text-gold-soft shrink-0">{i + 1}</div>
                  <p className="text-[14.5px] text-neutral-200 leading-relaxed">{a}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-10 p-6 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Key insight</div>
            <p className="mt-3 font-serif text-2xl leading-snug italic">&ldquo;{project.learnings}&rdquo;</p>
          </div>
          {attachedFiles.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
                <Paperclip className="h-3.5 w-3.5 text-gold" /> Documents &amp; downloads
                <span className="text-neutral-600">·</span>
                <span>{attachedFiles.length} file{attachedFiles.length === 1 ? '' : 's'}</span>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachedFiles.map((f) => {
                  const meta = CATEGORY_META[f.category] || CATEGORY_META.other
                  const pUrl = previewUrl(f)
                  return (
                    <div key={f.id} className="group relative rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.06] hover:border-gold/30 transition">
                      <div className="flex gap-4 p-4">
                        <div className={`h-16 w-16 rounded-lg bg-gradient-to-br ${meta.accent} flex items-center justify-center shrink-0 relative overflow-hidden`}>
                          {f.category === 'image' ? (
                            <img src={f.publicUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <span className="font-serif text-3xl text-white/70">{meta.emoji}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-widest text-neutral-500">{meta.label} · {formatBytes(f.size)}</div>
                          <div className="mt-0.5 text-[14px] font-medium truncate">{f.label || f.originalName}</div>
                          <div className="mt-3 flex items-center gap-2">
                            <a href={pUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full bg-gold/15 text-gold-soft border border-gold/30 hover:bg-gold/25 transition">
                              <Eye className="h-3 w-3" /> Preview
                            </a>
                            <a href={f.publicUrl} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition">
                              <DownloadIcon className="h-3 w-3" /> Download
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-1.5">
            {(project.tags || []).map((t) => (
              <span key={t} className="text-[11px] px-2.5 py-1 rounded-full text-neutral-400 border border-white/10">{t}</span>
            ))}
          </div>
          {related.length > 0 && (
            <div className="mt-5 pt-8 border-t border-white/5">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-4">Related work</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {related.map((r) => (
                  <button key={r.id} onClick={() => onOpenAnother(r)} className="text-left p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.05] transition group">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500">{r.category}</div>
                    <div className="mt-1 font-serif text-lg tracking-tight flex items-center justify-between gap-2">
                      {r.title}
                      <ArrowUpRight className="h-4 w-4 text-neutral-500 group-hover:text-gold shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------ Skills ------------------------------ */
