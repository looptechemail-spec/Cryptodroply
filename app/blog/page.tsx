import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import BlogTabs from '@/components/BlogTabs'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Blog', description: 'Guides and news on crypto tools, airdrops and privacy.' }

const fmt = (d: Date | null) => d?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default async function Blog() {
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED', access: 'FREE' },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    include: { translations: true, category: { include: { translations: true } } },
  })
  return (
    <div className="container">
      <div className="page-head">
        <h1>Blog</h1>
        <p style={{ fontSize: 20, maxWidth: 640 }}>Guides and news on crypto tools, airdrops and privacy. Free for everyone.</p>
      </div>
      <BlogTabs active="blog" />
      <div className="posts" style={{ margin: '28px 0 72px' }}>
        {posts.map((p) => {
          const t = pick(p.translations)
          const cat = p.category ? pick(p.category.translations)?.name : null
          return (
            <Link key={p.id} href={`/post/${p.slug}`} className="post-row">
              <span className="t">{t?.title}</span>
              <span className="m">{[cat, fmt(p.publishedAt)].filter(Boolean).join(', ')}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
