'use client'

import { useEffect } from 'react'
import { Download, Mail, Search, Sparkles, Layers, Zap, FileText, Briefcase } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { useSite } from '@/components/shared/site-context'

export const CommandPalette = ({ open, setOpen, onOpenProject, onOpenContact, setRecruiterMode, recruiterMode }) => {
  const { projects, skills, owner } = useSite()
  useEffect(() => {
    const down = (e) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [setOpen])
  const goto = (id) => { setOpen(false); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60) }
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, skills, sections…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => { setRecruiterMode(!recruiterMode); setOpen(false) }}><Sparkles className="mr-2 h-4 w-4 text-gold" />{recruiterMode ? 'Turn off Recruiter Mode' : 'Turn on Recruiter Mode (60-sec view)'}</CommandItem>
          <CommandItem onSelect={() => { onOpenContact(); setOpen(false) }}><Mail className="mr-2 h-4 w-4" /> Contact me</CommandItem>
          {owner?.resumeUrl && (
            <CommandItem onSelect={() => { window.open(owner.resumeUrl, '_blank'); setOpen(false) }}><Download className="mr-2 h-4 w-4" /> Download resume</CommandItem>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Sections">
          <CommandItem onSelect={() => goto('work')}><Layers className="mr-2 h-4 w-4" />Selected work</CommandItem>
          <CommandItem onSelect={() => goto('chapters')}><FileText className="mr-2 h-4 w-4" />About</CommandItem>
          <CommandItem onSelect={() => goto('skills')}><Zap className="mr-2 h-4 w-4" />Skills</CommandItem>
          <CommandItem onSelect={() => goto('experience')}><Briefcase className="mr-2 h-4 w-4" />Experience</CommandItem>
          <CommandItem onSelect={() => goto('contact')}><Mail className="mr-2 h-4 w-4" />Contact</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Projects">
          {(projects || []).filter((p) => !p.hidden).map((p) => (
            <CommandItem key={p.id} onSelect={() => { setOpen(false); setTimeout(() => onOpenProject(p), 60) }} value={`${p.title} ${p.category} ${p.industry} ${(p.tags || []).join(' ')}`}>
              <span className="mr-2 text-gold font-serif">{p.coverEmoji}</span>
              <span className="truncate">{p.title}</span>
              <span className="ml-auto text-[10px] text-neutral-500 uppercase tracking-widest">{p.category}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Skills">
          {(skills || []).flatMap((g) => g.items).map((s) => (
            <CommandItem key={s} onSelect={() => goto('skills')} value={s}>
              <Zap className="mr-2 h-4 w-4 text-gold/70" />{s}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

/* --------------------------- Footer --------------------------- */
