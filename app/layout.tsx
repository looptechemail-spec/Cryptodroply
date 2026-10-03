import './globals.css'
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminBar from '@/components/AdminBar'
import CookieBanner from '@/components/CookieBanner'
import { PageViews } from '@/components/PageViews'
import AssistantChat from '@/components/AssistantChat'
import { headers } from 'next/headers'
import { getLang, stripLang } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const font = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '700', '800'] })

const SITE = (process.env.SITE_URL ?? 'https://www.cryptodroply.com').replace(/\/$/, '')

/** Titolo e descrizione predefiniti nella lingua della pagina; canonical e hreflang puntano alle due versioni (senza ?ref= e simili). */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  const h = await headers()
  const clean = stripLang((h.get('x-pathname') ?? '/').split('?')[0].split('#')[0]).replace(/\/$/, '')
  const en = `${SITE}${clean || '/'}`
  const it = `${SITE}/it${clean}`
  const noLang = /^\/(admin|account|login|signup|forgot|reset)(\/|$)/.test(clean)
  return {
    metadataBase: new URL(SITE),
    alternates: noLang ? { canonical: lang === 'it' ? it : en } : { canonical: lang === 'it' ? it : en, languages: { en, it, 'x-default': en } },
    title: {
      default: lang === 'it' ? 'Cryptodroply | Strumenti crypto selezionati e soluzioni per la privacy' : 'Cryptodroply | Curated Crypto Tools and Privacy Solutions',
      template: '%s | Cryptodroply',
    },
    description:
      lang === 'it'
        ? 'Cryptodroply è la più grande directory di strumenti crypto: wallet, exchange, airdrop, DeFi, privacy, sicurezza e analisi.'
        : 'Cryptodroply is the largest crypto tools directory for wallets, exchanges, airdrops, DeFi, privacy, security and crypto analysis.',
    openGraph: { locale: lang === 'it' ? 'it_IT' : 'en_US', alternateLocale: lang === 'it' ? 'en_US' : 'it_IT' },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang()
  return (
    <html lang={lang} className={font.className}>
      <body>
        <AdminBar />
        <Header />
        <main>{children}</main>
        <Footer />
        <PageViews />
        <CookieBanner lang={lang} />
        <AssistantChat lang={lang === 'it' ? 'it' : 'en'} />
      </body>
    </html>
  )
}
