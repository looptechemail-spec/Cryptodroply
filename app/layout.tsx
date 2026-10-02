import './globals.css'
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminBar from '@/components/AdminBar'
import CookieBanner from '@/components/CookieBanner'
import { PageViews } from '@/components/PageViews'

export const dynamic = 'force-dynamic'

const font = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '700', '800'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'https://www.cryptodroply.com'),
  alternates: { canonical: './' }, // ogni pagina indica il proprio indirizzo ufficiale (senza ?ref= e simili)
  title: {
    default: 'Cryptodroply | Curated Crypto Tools and Privacy Solutions',
    template: '%s | Cryptodroply',
  },
  description:
    'Cryptodroply is the largest crypto tools directory for wallets, exchanges, airdrops, DeFi, privacy, security and crypto analysis.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.className}>
      <body>
        <AdminBar />
        <Header />
        <main>{children}</main>
        <Footer />
        <PageViews />
        <CookieBanner />
      </body>
    </html>
  )
}
