'use client'

import { useSite } from '@/components/shared/site-context'
import { SectionKicker, RevealText } from '@/components/shared/primitives'

export const AspirationalFirms = () => {
  const { aspirations } = useSite()
  const groups = aspirations || []
  if (groups.length === 0) return null
  return (
    <section className="relative py-12 md:py-16 border-t border-white/5">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <SectionKicker num="07">Ambition</SectionKicker>
        <RevealText delay={0.05}>
          <h2 className="mt-2 font-serif text-[26px] md:text-[34px] leading-[1.02] tracking-[-0.02em]">
            The firms I hold my work to. <span className="text-neutral-500">The bar they set is the bar I set.</span>
          </h2>
        </RevealText>
        <RevealText delay={0.15}>
          <div className="mt-5 relative rounded-xl overflow-hidden shine-border">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-gold/[0.03]" />
            <div className="relative p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
              {groups.map((g) => (
                <div key={g.group}>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-gold/80 pb-3 mb-3 border-b border-white/10">
                    {g.group}
                  </div>
                  <ul className="space-y-2.5">
                    {g.firms.map((f) => (
                      <li key={f} className="font-serif text-[17px] text-neutral-200/85 tracking-tight hover:text-white transition">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="relative px-6 md:px-10 pb-6 pt-2 text-[11px] text-neutral-500 border-t border-white/5">
              Aspirational credentials wall · Compiled June 2025 · Grayscale by design
            </div>
          </div>
        </RevealText>
      </div>
    </section>
  )
}

/* ============================== APP ============================== */
