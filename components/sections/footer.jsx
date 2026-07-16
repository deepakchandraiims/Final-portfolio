'use client'

import { Mail, Phone, MapPin, Clock, ExternalLink, Download, ArrowRight, Linkedin, Github, FileText } from 'lucide-react'
import { useSite } from '@/components/shared/site-context'
import { Shell } from '@/components/shared/layout'

const Row = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2.5 text-[11.5px] text-neutral-400">
    <Icon className="h-3 w-3 text-gold/70 shrink-0" />
    <span className="truncate">{children}</span>
  </div>
)

const QuickLink = ({ href, label, icon: Icon }) => (
  <a href={href || '#'} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
    className="group flex items-center justify-between gap-2 py-[5px] text-[11.5px] text-neutral-400 hover:text-gold transition focus-ring rounded">
    <span className="inline-flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3 opacity-60 group-hover:opacity-100" />}
      {label}
    </span>
    <ExternalLink className="h-2.5 w-2.5 text-neutral-700 group-hover:text-gold transition" />
  </a>
)

export const Footer = ({ onOpenContact }) => {
  const { owner } = useSite()
  const year = new Date().getFullYear()

  return (
    <footer id="contact-footer" className="relative border-t border-white/[0.06] bg-[#0B0E14]">
      <Shell>
        <div className="py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {/* let's connect */}
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-gold/80">Let&apos;s Connect</div>
            <p className="mt-3.5 text-[11.5px] leading-relaxed text-neutral-500 max-w-[240px]">
              Open to opportunities in Investment Banking, Strategic Finance, Corporate Development and M&amp;A.
            </p>
          </div>

          {/* contact details */}
          <div className="space-y-2.5 md:pt-[26px]">
            {owner?.email && <Row icon={Mail}>{owner.email}</Row>}
            {owner?.phone && <Row icon={Phone}>{owner.phone}</Row>}
            {owner?.location && <Row icon={MapPin}>{owner.location}</Row>}
            {owner?.availabilityShort && <Row icon={Clock}>{owner.availabilityShort}</Row>}
          </div>

          {/* quick links */}
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-neutral-500">Quick Links</div>
            <div className="mt-3 -my-[5px]">
              {owner?.resumeUrl && <QuickLink href={owner.resumeUrl} label="Resume" icon={FileText} />}
              {owner?.linkedin && <QuickLink href={owner.linkedin} label="LinkedIn" icon={Linkedin} />}
              {owner?.github && <QuickLink href={owner.github} label="GitHub" icon={Github} />}
              {owner?.email && <QuickLink href={`mailto:${owner.email}`} label="Email" icon={Mail} />}
            </div>
          </div>

          {/* resume + CTA */}
          <div>
            <a
              href={owner?.resumeUrl || '#'}
              target={owner?.resumeUrl ? '_blank' : undefined}
              rel="noreferrer"
              onClick={(e) => { if (!owner?.resumeUrl) e.preventDefault() }}
              className="group flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 hover:border-gold/30 transition focus-ring"
            >
              <span>
                <span className="block text-[9px] uppercase tracking-[0.16em] text-neutral-500">Download Resume</span>
                <span className="block text-[11.5px] text-neutral-300 mt-0.5">PDF Format</span>
              </span>
              <span className="h-7 w-7 rounded-md border border-white/10 flex items-center justify-center text-neutral-500 group-hover:text-gold group-hover:border-gold/30 transition shrink-0">
                <Download className="h-3 w-3" />
              </span>
            </a>

            <button
              onClick={onOpenContact}
              className="mt-2.5 w-full h-10 rounded-lg bg-gold text-[#090B10] text-[10px] font-medium uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 hover:bg-gold-soft transition focus-ring group"
            >
              Schedule a Discussion
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* bottom bar */}
        <div className="py-4 border-t border-white/[0.05] flex items-center justify-between gap-4 flex-wrap">
          <div className="text-[10.5px] text-neutral-600">
            © {year} {owner?.name}. All rights reserved.
          </div>
          <div className="flex items-center gap-5">
            <a href="/admin" className="text-[10.5px] text-neutral-600 hover:text-neutral-300 transition">Admin</a>
            <span className="text-[10.5px] text-neutral-700 uppercase tracking-[0.12em]">Privacy Policy</span>
            <span className="text-[10.5px] text-neutral-700 uppercase tracking-[0.12em]">Terms of Use</span>
          </div>
        </div>
      </Shell>
    </footer>
  )
}
