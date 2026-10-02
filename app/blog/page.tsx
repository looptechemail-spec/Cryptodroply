import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import { cleanText } from '@/lib/clean'
import BlogTabs from '@/components/BlogTabs'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: 'Blog',
    description: t('Guides and news on crypto tools, airdrops and privacy.', 'Guide e novità su strumenti crypto, airdrop e privacy.'),
  }
}

export default async function Blog() {
  const { t: tr, it, loc } = await i18n()
  const fmt = (d: Date | null) => d?.toLocaleDateString(it ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED', access: 'FREE' },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    include: { translations: true, category: { include: { translations: true } } },
  })
  return (
    <div className="container">
      <div className="page-head">
        <h1>Blog</h1>
        <p style={{ fontSize: 20, maxWidth: 640 }}>{tr('Guides and news on crypto tools, airdrops and privacy. Free for everyone.', 'Guide e novità su strumenti crypto, airdrop e privacy. Gratis per tutti.')}</p>
      </div>
      <BlogTabs active="blog" />
      <div className="posts" style={{ margin: '28px 0 72px' }}>
        {posts.map((p) => {
          const t = pick(p.translations, loc)
          const cat = p.category ? pick(p.category.translations, loc)?.name : null
          return (
            <Link key={p.id} href={`/post/${p.slug}`} className="post-row has-thumb">
              {p.coverUrl && <img src={p.coverUrl} alt="" className="post-thumb" loading="lazy" />}
              <span className="t">{cleanText(t?.title)}</span>
              <span className="m">{[cat, fmt(p.publishedAt)].filter(Boolean).join(', ')}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
