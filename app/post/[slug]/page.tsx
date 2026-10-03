import { JsonLd } from '@/components/JsonLd'
import { breadcrumbs } from '@/lib/jsonld'
import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import { hasPro, PRO_PRICE_LABEL, PRO_PRICE_LABEL_IT } from '@/lib/access'
import { renderMarkdown } from '@/lib/markdown'
import { cleanText } from '@/lib/clean'
import { headers } from 'next/headers'

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
  const { loc } = await i18n()
  const t = pick(post.translations, loc)
  if (post.access === 'PRO' && !(await hasPro())) {
    // Analisi a pagamento: niente estratto, niente immagine, niente indicizzazione.
    return { title: t?.title, robots: { index: false, follow: false } }
  }
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const image = post.coverUrl ? (post.coverUrl.startsWith('/') && host ? `https://${host}${post.coverUrl}` : post.coverUrl) : undefined
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
  const { t: tr, it, loc } = await i18n()
  const t = pick(post.translations, loc)
  const locked = post.access === 'PRO' && !(await hasPro())
  const html = renderMarkdown(t?.contentMd ?? '')

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <h1 style={{ fontSize: 44 }}>{cleanText(t?.title)}</h1>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>
          {[post.category ? pick(post.category.translations, loc)?.name : null, post.publishedAt?.toLocaleDateString(it ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })]
            .filter(Boolean)
            .join(', ')}
        </p>
      </div>
      {locked ? (
        <div className="paywall">
          <span className="paywall-lock" aria-hidden="true">&#128274;</span>
          <h2>{tr('This analysis is for PRO members', 'Questa analisi è riservata a chi ha PRO')}</h2>
          <p>{tr(`Get PRO for ${PRO_PRICE_LABEL} to read this and every weekly analysis in full.`, `Passa a PRO a ${PRO_PRICE_LABEL_IT} per leggere questa e tutte le analisi settimanali complete.`)}</p>
          <Link href="/signup?plan=pro" className="btn btn-yellow">
            {tr('Get PRO', 'Passa a PRO')}
          </Link>
          <Link href="/login" className="paywall-login">
            {tr('Already a member? Log in', 'Sei già iscritto? Accedi')}
          </Link>
        </div>
      ) : (
        <>
          {post.coverUrl && !(t?.contentMd ?? '').includes(post.coverUrl) && <img src={post.coverUrl} alt="" style={{ borderRadius: 20, width: '100%' }} />}
          <div className="md" style={{ margin: '32px 0 72px' }} dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
      {!locked && <JsonLd data={breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: cleanText(t?.title) ?? 'Article', path: `/post/${post.slug}` }], it ? 'it' : 'en')} />}
      {!locked && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org', '@type': 'Article', inLanguage: it ? 'it' : 'en',
              headline: cleanText(t?.title), description: t?.seoDescription ?? t?.excerpt ?? undefined,
              image: post.coverUrl ? [post.coverUrl.startsWith('/') ? `${(process.env.SITE_URL ?? 'https://www.cryptodroply.com').replace(/\/$/, '')}${post.coverUrl}` : post.coverUrl] : undefined,
              datePublished: post.publishedAt?.toISOString(), dateModified: post.updatedAt.toISOString(),
              author: { '@type': 'Organization', name: 'Cryptodroply' },
              publisher: { '@type': 'Organization', name: 'Cryptodroply' },
            }),
          }}
        />
      )}
    </div>
  )
}
