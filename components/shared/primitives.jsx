'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'

export const SectionKicker = ({ children, num }) => (
  <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-neutral-400">
    <span className="text-gold/80 font-mono">{num}</span>
    <span className="h-px w-8 bg-neutral-700" />
    <span>{children}</span>
  </div>
)

/**
 * Scroll reveal that CANNOT strand content invisible.
 *
 * The previous implementation used framer-motion's `whileInView`, which relies
 * solely on IntersectionObserver. IO callbacks are async and get coalesced or
 * dropped during fast scrolling — and because the initial state is opacity:0,
 * any missed element stayed invisible forever. That was the cause of the large
 * black voids in the Transactions / Firms sections.
 *
 * This version pairs the observer with a synchronous rect check on scroll
 * (which cannot be missed) and degrades to visible if IO is unavailable.
 */
export const useRevealed = (ref) => {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return }

    let io = null
    const reveal = () => {
      setShown(true)
      io?.disconnect()
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
    // Synchronous fallback — immune to dropped observer callbacks.
    const check = () => {
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight * 0.94 && r.bottom > 0) reveal()
    }

    io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) reveal()
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' })
    io.observe(el)

    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check, { passive: true })
    return () => {
      io?.disconnect()
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [ref])
  return shown
}

export const RevealText = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null)
  const shown = useRevealed(ref)
  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.6, delay: shown ? delay : 0, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const MagneticButton = ({ children, className = '', ...props }) => {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ x: (e.clientX - r.left - r.width / 2) * 0.15, y: (e.clientY - r.top - r.height / 2) * 0.2 })
  }
  return (
    <motion.button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// Parse "$4.8B+" → { prefix:'$', number:4.8, suffix:'B+', decimals:1 }

export const parseMetric = (str) => {
  const m = String(str ?? '').match(/^([^\d.-]*)([\d.,]+)(.*)$/)
  if (!m) return { prefix: '', number: 0, suffix: String(str ?? ''), decimals: 0 }
  const numStr = m[2].replace(/,/g, '')
  const decimals = (numStr.split('.')[1] || '').length
  return { prefix: m[1], number: parseFloat(numStr), suffix: m[3], decimals: Math.min(decimals, 2) }
}

// Animate a number from 0 → target when scrolled into view

export const CountUp = ({ raw, duration = 1600, className = '' }) => {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  const [done, setDone] = useState(false)
  const parsed = useMemo(() => parseMetric(raw), [raw])
  useEffect(() => {
    if (!ref.current || done) return
    const el = ref.current
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setDone(true)
        const start = performance.now()
        const to = parsed.number
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - t, 4)
          setVal(to * eased)
          if (t < 1) requestAnimationFrame(tick)
          else setVal(to)
        }
        requestAnimationFrame(tick)
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [parsed.number, duration, done])
  const display = parsed.decimals ? val.toFixed(parsed.decimals) : Math.round(val).toLocaleString()
  return (
    <span ref={ref} className={className}>
      <span>{parsed.prefix}</span>
      <span className="tabular-nums">{display}</span>
      <span>{parsed.suffix}</span>
    </span>
  )
}

/* --------------------------- Nav --------------------------- */
