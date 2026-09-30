import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import { hasPro, PRO_PRICE_LABEL } from '@/lib/access'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const load = (slug: string) =>
  db.post.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { translations: true, category: { include: { translations: true } } },
  })

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await load(slug)
  if (!post) return {}
  const t = pick(post.translations)
  const image = post.coverUrl ?? undefined
  return {
    title: t?.seoTitle ?? t?.title,
    description: t?.seoDescription ?? t?.excerpt ?? undefined,
    openGraph: { title: t?.title, description: t?.excerpt ?? undefined, images: image ? [image] : undefined },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await load(slug)
  if (!post) notFound()
  const t = pick(post.translations)
  const locked = post.access === 'PRO' && !(await hasPro())
  // TODO: l'import porta il testo semplice; la formattazione ricca arriva con la conversione Ricos -> Markdown
  const paragraphs = (t?.contentMd ?? '').split(/\n{2,}/).filter(Boolean)

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <h1 style={{ fontSize: 44 }}>{t?.title}</h1>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>
          {[post.category ? pick(post.category.translations)?.name : null, post.publishedAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })]
            .filter(Boolean)
            .join(', ')}
        </p>
      </div>
      {post.coverUrl && <img src={post.coverUrl} alt="" style={{ borderRadius: 20, width: '100%' }} />}
      <div className="prose" style={{ margin: '32px 0 72px' }}>
        {(locked ? paragraphs.slice(0, 2) : paragraphs).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {locked && (
          <div className="video-locked" style={{ aspectRatio: 'auto', padding: 36, marginTop: 24 }}>
            <b>The rest of this article is for PRO members</b>
            <Link href="/signup?plan=pro" className="btn btn-yellow btn-sm">
              Get PRO for {PRO_PRICE_LABEL}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
