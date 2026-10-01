import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Best crypto tools by category', description: 'Curated lists of the best crypto wallets, exchanges, airdrop tools and more, with plain guides.' }

export default async function BestIndex() {
  const pages = await db.seoPage.findMany({ where: { status: 'PUBLISHED' }, orderBy: { title: 'asc' } })
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head"><h1>Best crypto tools</h1><p className="section-intro">Curated lists, each tool with a plain guide.</p></div>
      {pages.length === 0 && <p>Coming soon.</p>}
      <ul className="seo-list">{pages.map((p) => <li key={p.id}><Link href={`/best/${p.slug}`}>{p.title}</Link></li>)}</ul>
    </div>
  )
}
