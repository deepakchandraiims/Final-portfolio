'use client'

import { useEffect, useState } from 'react'
import { SEED_CONTENT } from '@/lib/portfolio-data'
import { SiteContext } from '@/components/shared/site-context'
import { AnalyticsBeacon } from '@/components/shared/analytics-beacon'
import { ScrollBar } from '@/components/sections/scroll-bar'
import { Nav } from '@/components/sections/nav'
import { Hero } from '@/components/sections/hero'
import { Philosophy } from '@/components/sections/philosophy'
import { Projects, CaseStudyDialog } from '@/components/sections/projects'
import { SelectedTransactions } from '@/components/sections/transactions'
import { CareerSection } from '@/components/sections/career'
import { SkillsSection } from '@/components/sections/skills'
import { Certifications } from '@/components/sections/certifications'
import { Research } from '@/components/sections/research'
import { InvestmentLabSection } from '@/components/sections/investment-lab'
import { Models } from '@/components/sections/models'
import { AspirationalFirms } from '@/components/sections/aspirational-firms'
import { About } from '@/components/sections/about'
import { ContactSection, ContactDialog } from '@/components/sections/contact'
import { CommandPalette } from '@/components/sections/command-palette'
import { Footer } from '@/components/sections/footer'
import { RecruiterSlideshow } from '@/components/sections/recruiter-slideshow'

export default function App() {
  const [content, setContent] = useState(SEED_CONTENT)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [recruiterOpen, setRecruiterOpen] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  const [projectOpen, setProjectOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/content')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data || data.error) return
        setContent({ ...SEED_CONTENT, ...data })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const openProject = (p) => { setActiveProject(p); setProjectOpen(true) }
  const closeProject = () => { setProjectOpen(false); setTimeout(() => setActiveProject(null), 200) }

  return (
    <SiteContext.Provider value={content}>
      <main className="relative min-h-screen">
        <AnalyticsBeacon recruiterMode={recruiterOpen} />
        <ScrollBar />
        <Nav
          onOpenSearch={() => setCmdOpen(true)}
          onOpenRecruiter={() => setRecruiterOpen(true)}
          onOpenContact={() => setContactOpen(true)}
        />

        <Hero onOpenContact={() => setContactOpen(true)} />
        <Philosophy />
        <Projects onOpenProject={openProject} />
        <SelectedTransactions onOpenProject={openProject} />
        <Models />
        <Research />
        <InvestmentLabSection />
        <CareerSection />
        <SkillsSection />
        <Certifications />
        <AspirationalFirms />
        <About />
        <ContactSection onOpenContact={() => setContactOpen(true)} />
        <Footer onOpenContact={() => setContactOpen(true)} />

        <CommandPalette
          open={cmdOpen} setOpen={setCmdOpen}
          onOpenProject={openProject}
          onOpenContact={() => setContactOpen(true)}
          setRecruiterMode={setRecruiterOpen}
          recruiterMode={recruiterOpen}
        />
        <CaseStudyDialog project={activeProject} open={projectOpen} onClose={closeProject} onOpenAnother={(p) => setActiveProject(p)} />
        <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
        <RecruiterSlideshow
          open={recruiterOpen}
          onClose={() => setRecruiterOpen(false)}
          onOpenContact={() => setContactOpen(true)}
        />
      </main>
    </SiteContext.Provider>
  )
}
