import './globals.css'
import { Providers } from './providers'
import { SEED_CONTENT } from '@/lib/portfolio-data'
import { Inter, Fraunces, IBM_Plex_Mono } from 'next/font/google'

// Body — clean, neutral, institutional
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Display / headings — Canela/IvyPresto are licensed; Fraunces is the closest
// high-contrast editorial serif that ships free and self-hosts via next/font.
const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT', 'WONK'],
})

// Numbers, tables, deal tickers — investment-memorandum feel
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deepak.finance'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Deepak — Investment Banking, Strategic Finance & M&A',
    template: '%s — Deepak',
  },
  description:
    'Institutional-grade financial intelligence — DCF, LBO, M&A execution, corporate development, and AI-augmented deal workflows. Selected transactions, case studies, and downloadable analytics.',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Deepak — Investment Banking, Strategic Finance & M&A',
    description:
      'Institutional-grade financial intelligence. Selected transactions, valuation work, and AI-augmented deal workflows.',
    siteName: 'Deepak',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deepak — Investment Banking, Strategic Finance & M&A',
    description:
      'Institutional-grade financial intelligence. Selected transactions, valuation work, and AI-augmented deal workflows.',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${serif.variable} ${mono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: SEED_CONTENT.owner.name,
            jobTitle: SEED_CONTENT.owner.currentRole,
            description: SEED_CONTENT.owner.tagline,
            url: SITE_URL,
            sameAs: [SEED_CONTENT.owner.linkedin, SEED_CONTENT.owner.github].filter(Boolean),
            knowsAbout: ['Investment Banking','Valuation','M&A','Corporate Development','Financial Modeling','Private Equity'],
          }) }}
        />
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-gold/30 selection:text-gold-soft">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
