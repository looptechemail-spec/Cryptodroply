import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import { hasPro, PRO_PRICE_LABEL } from '@/lib/access'
import BlogTabs from '@/components/BlogTabs'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Analyses', description: 'In-depth crypto analysis for PRO members.' }

const fmt = (d: Date | null) => d?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default async function Analyses() {
  const [posts, member] = await Promise.all([
    db.post.findMany({
      where: { status: 'PUBLISHED', access: 'PRO' },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      include: { translations: true, category: { include: { translations: true } } },
    }),
    hasPro(),
  ])
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
      {!member && (
        <div className="lock-banner">
          <div>
            <b>Full analyses are for PRO members</b>
            <span>You can read the opening of every analysis. Unlock the full text for {PRO_PRICE_LABEL}.</span>
          </div>
          <Link href="/signup?plan=pro" className="btn btn-yellow btn-sm">
            Get PRO
          </Link>
        </div>
      )}
      <div className="posts" style={{ margin: '28px 0 72px' }}>
        {posts.map((p) => {
          const t = pick(p.translations)
          const cat = p.category ? pick(p.category.translations)?.name : null
          return (
            <Link key={p.id} href={`/post/${p.slug}`} className="post-row">
              <span className="t">
                {!member && <span className="lock" aria-label="Locked">&#128274;</span>}
                {t?.title}
              </span>
              <span className="m">{[cat, fmt(p.publishedAt)].filter(Boolean).join(', ')}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
