import { notFound } from 'next/navigation'
import Link from 'next/link'
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
  return { title: p.title, description: p.metaDescription, alternates: { canonical: `${siteUrl()}/best/${p.slug}` }, ...(p.status !== 'PUBLISHED' ? { robots: { index: false } } : {}) }
}

export default async function SeoPage({ params }: Props) {
  const p = await load((await params).slug)
  if (!p) notFound()
  const tools = await toolsForSeoPage(p)
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: p.title,
    itemListElement: tools.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.title, url: `${siteUrl()}/${t.categorySlug}/${t.slug}` })),
  }
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      {p.status !== 'PUBLISHED' && <p className="badge-pro" style={{ display: 'inline-block' }}>DRAFT, only you can see this</p>}
      <div className="page-head">
        <h1>{p.title}</h1>
        {p.intro.split(/\n\s*\n/).map((para, i) => <p key={i} className="section-intro">{cleanText(para)}</p>)}
      </div>
      <div className="seo-grid">{tools.map((t) => <AppCard key={t.id} tool={t} />)}</div>
      <p style={{ marginTop: 32 }}>See the full list with filters: <Link href={`/${p.categorySlug}`}>all {p.categorySlug.replace(/-/g, ' ')}</Link></p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  )
}
