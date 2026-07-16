'use client'

import { useState } from 'react'
import { Mail, Linkedin, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSite } from '@/components/shared/site-context'
import { SectionKicker, RevealText, MagneticButton } from '@/components/shared/primitives'

export const ContactSection = ({ onOpenContact }) => {
  const { owner } = useSite()
  return (
    <section id="contact" className="relative py-12 md:py-16 border-t border-white/5">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden shine-border">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-violet-500/10" />
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="relative p-10 md:p-20">
            <SectionKicker num="08">Contact</SectionKicker>
            <RevealText delay={0.05}>
              <h2 className="mt-6 font-serif text-[48px] md:text-[88px] leading-[0.95] tracking-[-0.02em] max-w-4xl">
                Let&apos;s build the <span className="gold-gradient-text italic">next chapter</span> together.
              </h2>
            </RevealText>
            <RevealText delay={0.15}>
              <p className="mt-8 max-w-2xl text-neutral-400 text-[15px]">{owner?.bio}</p>
            </RevealText>
            <div className="mt-10 flex flex-wrap gap-3">
              <MagneticButton onClick={onOpenContact} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold text-neutral-900 font-medium px-6 py-3 text-sm shadow-lg shadow-gold/20 hover:shadow-gold/40 transition">
                <Mail className="h-4 w-4" /> Send a message
              </MagneticButton>
              {owner?.linkedin && (
                <a href={owner.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm text-neutral-200 hover:bg-white/[0.08] transition">
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </a>
              )}
              {owner?.email && (
                <a href={`mailto:${owner.email}`} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm text-neutral-300 hover:text-white transition border border-white/10 hover:border-white/20">
                  {owner.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------- Contact Dialog ------------------------- */

export const ContactDialog = ({ open, onClose, recruiterMode }) => {
  const [form, setForm] = useState({ name: '', email: '', company: '', role: '', message: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, recruiterMode }) })
      if (res.ok) { setDone(true); setTimeout(() => { setDone(false); onClose() }, 1600) }
    } catch (err) { console.error(err) } finally { setSending(false) }
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-neutral-950 border-white/10">
        <DialogHeader><DialogTitle className="font-serif text-2xl tracking-tight">Send a message</DialogTitle></DialogHeader>
        {done ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-400/15 flex items-center justify-center border border-emerald-400/30"><Check className="h-5 w-5 text-emerald-400" /></div>
            <div className="mt-2 font-serif text-xl">Received. I&apos;ll get back within 24 hours.</div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-gold/40" />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-gold/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-gold/40" />
              <input placeholder="Your role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-gold/40" />
            </div>
            <textarea required rows={5} placeholder="What are you hiring for / what would you like to discuss?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-gold/40 resize-none" />
            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-neutral-500">{recruiterMode ? 'Sent from Recruiter Mode · flagged as priority' : 'Direct inbound'}</div>
              <Button type="submit" disabled={sending} className="bg-gold text-neutral-900 hover:bg-gold-soft rounded-full h-9">
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* --------------------- Command Palette (⌘K) --------------------- */
