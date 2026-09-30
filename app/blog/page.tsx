import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import { PRO_PRICE_LABEL } from '@/lib/access'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Blog', description: 'Guides, news and weekly crypto analysis.' }

const fmt = (d: Date | null) => d?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default async function Blog() {
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    include: { translations: true, category: { include: { translations: true } } },
  })
  const free = posts.filter((p) => p.access === 'FREE')
  const pro = posts.filter((p) => p.access === 'PRO')

  const Row = ({ p }: { p: (typeof posts)[number] }) => {
    const t = pick(p.translations)
    const cat = p.category ? pick(p.category.translations)?.name : null
    return (
      <Link href={`/post/${p.slug}`} className="post-row">
        <span className="t">
          {t?.title}
          {p.access === 'PRO' && <span className="badge-pro" style={{ marginLeft: 10, verticalAlign: 'middle' }}>PRO</span>}
        </span>
        <span className="m">{[cat, fmt(p.publishedAt)].filter(Boolean).join(', ')}</span>
      </Link>
    )
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Blog</h1>
        <p style={{ fontSize: 20, maxWidth: 640 }}>Guides and news for everyone, and in-depth analysis for PRO members.</p>
      </div>

      <section className="group">
        <div className="row-head">
          <h2 style={{ fontSize: 28 }}>Free for everyone</h2>
          <span style={{ color: 'var(--muted)' }}>{free.length} articles</span>
        </div>
        <div className="posts">{free.map((p) => <Row key={p.id} p={p} />)}</div>
      </section>

      <section className="group" style={{ marginBottom: 72 }}>
        <div className="row-head">
          <div>
            <h2 style={{ fontSize: 28 }}>
              PRO analysis <span className="badge-pro" style={{ verticalAlign: 'middle' }}>PRO</span>
            </h2>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
              In-depth analyses for members. The first lines are open, the full text is for PRO ({PRO_PRICE_LABEL}).
            </p>
          </div>
          <Link href="/signup?plan=pro">Get PRO</Link>
        </div>
        <div className="posts">{pro.map((p) => <Row key={p.id} p={p} />)}</div>
      </section>
    </div>
  )
}
