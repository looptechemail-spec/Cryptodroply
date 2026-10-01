import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import { cleanText } from '@/lib/clean'
import { hasPro, PRO_PRICE_LABEL } from '@/lib/access'
import BlogTabs from '@/components/BlogTabs'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Analyses', description: 'In-depth crypto analysis for PRO members.', robots: { index: false, follow: false } }

const fmt = (d: Date | null) => d?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default async function Analyses() {
  const member = await hasPro()
  // Chi non è PRO non riceve nemmeno i titoli: si leggono solo se si è abbonati.
  const posts = member
    ? await db.post.findMany({
      where: { status: 'PUBLISHED', access: 'PRO' },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      include: { translations: true, category: { include: { translations: true } } },
    })
    : []
  const total = member ? posts.length : await db.post.count({ where: { status: 'PUBLISHED', access: 'PRO' } })
  return (
    <div className="container">
      <div className="page-head">
        <h1>
          Analyses <span className="badge-pro" style={{ verticalAlign: 'middle' }}>PRO</span>
        </h1>
        <p style={{ fontSize: 20, maxWidth: 680 }}>
          Weekly and in-depth analysis built on price structure, on-chain data, fundamentals and risk.
        </p>
      </div>
      <BlogTabs active="analyses" />
      {!member ? (
        <div className="paywall" style={{ marginTop: 28 }}>
          <span className="paywall-lock" aria-hidden="true">&#128274;</span>
          <h2>Analyses are for PRO members</h2>
          <p>
            {total} in-depth analyses on price structure, on-chain data, fundamentals and risk. Get PRO for {PRO_PRICE_LABEL} to read them all.
          </p>
          <Link href="/signup?plan=pro" className="btn btn-yellow">
            Get PRO
          </Link>
          <Link href="/login" className="paywall-login">
            Already a member? Log in
          </Link>
        </div>
      ) : (
        <div className="posts" style={{ margin: '28px 0 72px' }}>
          {posts.map((p) => {
            const t = pick(p.translations)
            const cat = p.category ? pick(p.category.translations)?.name : null
            return (
              <Link key={p.id} href={`/post/${p.slug}`} className="post-row">
                <span className="t">{cleanText(t?.title)}</span>
                <span className="m">{[cat, fmt(p.publishedAt)].filter(Boolean).join(', ')}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
