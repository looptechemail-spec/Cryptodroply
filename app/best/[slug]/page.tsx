import { notFound } from 'next/navigation'
import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { toolsForSeoPage } from '@/lib/seo-pages'
import { AppCard } from '@/components/AppCard'
import { cleanText } from '@/lib/clean'
import { siteUrl } from '@/lib/email'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }> }

async function load(slug: string) {
  const p = await db.seoPage.findUnique({ where: { slug } })
  if (!p) return null
  if (p.status !== 'PUBLISHED' && !(await isAdmin())) return null
  return p
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug)
  if (!p) return {}
  // le pagine /best esistono solo in inglese: anche sotto /it il canonical punta alla versione inglese, senza languages (nessuna versione italiana)
  return { title: p.title, description: p.metaDescription, alternates: { canonical: `${siteUrl()}/best/${p.slug}` }, ...(p.status !== 'PUBLISHED' ? { robots: { index: false } } : {}) }
}

export default async function SeoPage({ params }: Props) {
  const { lang } = await i18n()
  const p = await load((await params).slug)
  if (!p) notFound()
  const tools = await toolsForSeoPage(p)
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: p.title,
    itemListElement: tools.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.title, url: `${siteUrl()}/${x.categorySlug}/${x.slug}` })),
  }
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      {p.status !== 'PUBLISHED' && <p className="badge-pro" style={{ display: 'inline-block' }}>DRAFT, only you can see this</p>}
      <div className="page-head">
        <h1>{p.title}</h1>
        {p.intro.split(/\n\s*\n/).map((para, i) => <p key={i} className="section-intro">{cleanText(para)}</p>)}
      </div>
      <div className="seo-grid">{tools.map((x) => <AppCard key={x.id} tool={x} lang={lang} />)}</div>
      <p style={{ marginTop: 32 }}>See the full list with filters: <Link href={`/${p.categorySlug}`}>all {p.categorySlug.replace(/-/g, ' ')}</Link></p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  )
}
