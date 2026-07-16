'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Presentation, Download, Menu, X, Sun, Moon } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'

const LINKS = [
  { href: '#top', label: 'Home' },
  { href: '#transactions', label: 'Transactions' },
  { href: '#work', label: 'Projects' },
  { href: '#models', label: 'Models' },
  { href: '#research', label: 'Research' },
  { href: '#lab', label: 'Investment Lab' },
  { href: '#experience', label: 'Experience' },
  { href: '#education', label: 'Education' },
  { href: '#skills', label: 'Skills' },
  { href: '#certificates', label: 'Certificates' },
  { href: '#insights', label: 'Insights' },
]

const ThemeToggle = () => {
  const [dim, setDim] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--contrast-boost', dim ? '1' : '0')
    root.classList.toggle('high-contrast', dim)
  }, [dim])
  return (
    <button onClick={() => setDim((v) => !v)} aria-label="Toggle contrast"
      title="Toggle high-contrast reading mode"
      className="h-8 w-8 rounded-md border border-white/[0.08] hover:border-gold/40 flex items-center justify-center text-neutral-500 hover:text-gold transition focus-ring">
      {dim ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
    </button>
  )
}

export const Nav = ({ onOpenSearch, onOpenRecruiter, onOpenContact }) => {
  const { owner } = useSite()
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('#top')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // scroll-spy
  useEffect(() => {
    const ids = LINKS.filter((l) => !l.external).map((l) => l.href.slice(1))
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(`#${visible[0].target.id}`)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0.1, 0.5] }
    )
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const initials = (owner?.name || 'D').trim().charAt(0).toUpperCase()

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#090B10]/80 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-transparent border-b border-transparent'
        }`}>
        <div className="max-w-[1240px] xl:max-w-[1460px] mx-auto px-5 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          {/* logo lockup */}
          <a href="#top" className="flex items-center gap-2.5 shrink-0 focus-ring rounded">
            <span className="h-7 w-7 rounded border border-gold/40 bg-gold/[0.08] flex items-center justify-center">
              <span className="font-serif text-[13px] text-gold leading-none">{initials}</span>
            </span>
            <span className="hidden sm:block leading-none">
              <span className="block text-[11px] font-medium tracking-[0.14em] uppercase text-neutral-100">{owner?.name}</span>
              <span className="block text-[8px] tracking-[0.18em] uppercase text-neutral-600 mt-[3px]">Investment Banker</span>
            </span>
          </a>

          {/* links */}
          <nav className="hidden xl:flex items-center gap-0 flex-1 min-w-0 justify-center">
            {LINKS.map((l) => {
              const on = active === l.href
              return (
                <a key={l.href} href={l.href}
                  className={`relative shrink-0 whitespace-nowrap px-2 py-1.5 text-[9px] uppercase tracking-[0.1em] transition focus-ring rounded ${
                    on ? 'text-gold' : 'text-neutral-500 hover:text-neutral-200'
                  }`}>
                  {l.label}
                  {on && <motion.span layoutId="navUnderline" className="absolute left-2 right-2 -bottom-px h-px bg-gold" />}
                </a>
              )
            })}
          </nav>

          {/* actions */}
          <div className="flex items-center gap-1.5 ml-auto xl:ml-0 shrink-0">
            <button onClick={onOpenSearch} aria-label="Search (Cmd+K)"
              className="h-8 w-8 rounded-md border border-white/[0.08] hover:border-white/20 flex items-center justify-center text-neutral-500 hover:text-neutral-200 transition focus-ring">
              <Search className="h-3.5 w-3.5" />
            </button>

            <button onClick={onOpenRecruiter}
              aria-label="Open 60-second recruiter overview"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-md border border-gold/30 text-[9.5px] uppercase tracking-[0.12em] text-gold hover:bg-gold/[0.08] hover:border-gold/50 transition focus-ring"
              title="60-second recruiter overview">
              <Presentation className="h-3 w-3 shrink-0" />
              <span className="hidden xs:inline sm:inline">Recruiter</span>
            </button>

            {owner?.resumeUrl ? (
              <a href={owner.resumeUrl} target="_blank" rel="noreferrer"
                className="hidden sm:inline-flex xl:hidden 2xl:inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-gold/40 text-[9.5px] uppercase tracking-[0.12em] text-gold hover:bg-gold/[0.08] transition focus-ring">
                <Download className="h-3 w-3" /> Résumé
              </a>
            ) : null}

            <button onClick={onOpenContact}
              className="hidden sm:inline-flex items-center h-8 px-3.5 rounded-md bg-gold text-[#090B10] text-[9.5px] font-medium uppercase tracking-[0.12em] hover:bg-gold-soft transition focus-ring">
              Let&apos;s Talk
            </button>

            <ThemeToggle />

            <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
              className="xl:hidden h-8 w-8 rounded-md border border-white/[0.08] flex items-center justify-center text-neutral-400 focus-ring">
              <Menu className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] xl:hidden">
            <div className="absolute inset-0 bg-[#090B10]/90 backdrop-blur-xl" onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 bottom-0 w-[82%] max-w-[320px] bg-[#11161D] border-l border-white/[0.07] p-6 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Menu</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
                  className="h-8 w-8 rounded-md border border-white/[0.1] flex items-center justify-center text-neutral-400 focus-ring">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <nav className="mt-7 flex flex-col">
                {LINKS.map((l, i) => (
                  <motion.a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                    initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    className="py-3 border-b border-white/[0.05] text-[12px] uppercase tracking-[0.14em] text-neutral-300 hover:text-gold transition">
                    {l.label}
                  </motion.a>
                ))}
              </nav>
              <div className="mt-7 space-y-2">
                <button onClick={() => { setMobileOpen(false); onOpenRecruiter?.() }}
                  className="w-full h-10 rounded-md border border-white/[0.12] text-[10px] uppercase tracking-[0.14em] text-neutral-200 flex items-center justify-center gap-2">
                  <Presentation className="h-3.5 w-3.5" /> Recruiter view
                </button>
                {owner?.resumeUrl && (
                  <a data-drawerResume href={owner.resumeUrl} target="_blank" rel="noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="w-full h-10 rounded-md border border-gold/40 text-[10px] uppercase tracking-[0.14em] text-gold flex items-center justify-center gap-2">
                    <Download className="h-3.5 w-3.5" /> Résumé
                  </a>
                )}
                <button onClick={() => { setMobileOpen(false); onOpenContact?.() }}
                  className="w-full h-10 rounded-md bg-gold text-[#090B10] text-[10px] font-medium uppercase tracking-[0.14em]">
                  Let&apos;s Talk
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
