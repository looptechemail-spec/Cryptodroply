import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick, youtubeEmbed } from '@/lib/content'
import { hasPro, PRO_PRICE_LABEL } from '@/lib/access'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ category: string; slug: string }> }

async function load(categoryParam: string, slug: string) {
  const pro = categoryParam.startsWith('pro-')
  const categorySlug = pro ? categoryParam.slice(4) : categoryParam
  const tool = await db.tool.findFirst({
    where: { slug, status: 'PUBLISHED', category: { slug: categorySlug } },
    include: {
      translations: true,
      videos: { orderBy: { sortOrder: 'asc' } },
      category: {
        include: {
          translations: true,
          attributes: { orderBy: { sortOrder: 'asc' } },
          tools: {
            where: { status: 'PUBLISHED', NOT: { slug } },
            take: 3,
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  })
  return { tool, pro }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params
  const { tool } = await load(category, slug)
  if (!tool) return {}
  const t = pick(tool.translations)
  const description = t?.seoDescription ?? t?.description ?? undefined
  // l'anteprima quando il link viene condiviso è il logo dello strumento
  const image = tool.logoUrl ?? tool.coverUrl ?? undefined
  return {
    title: t?.seoTitle ?? tool.title,
    description,
    openGraph: { title: tool.title, description, images: image ? [image] : undefined },
    twitter: { card: 'summary', title: tool.title, description, images: image ? [image] : undefined },
  }
}

export default async function ToolPage({ params }: Props) {
  const { category, slug } = await params
  const { tool, pro } = await load(category, slug)
  if (!tool) notFound()

  const isMember = await hasPro()
  const t = pick(tool.translations)
  const catName = pick(tool.category.translations)?.name ?? tool.category.slug
  const base = pro ? `/pro-${tool.category.slug}` : `/${tool.category.slug}`
  const values = (tool.attributes ?? {}) as Record<string, string>
  const facts = tool.category.attributes
    .map((a) => ({ label: a.labelEn, value: values[a.key] }))
    .filter((f) => f.value)
  const sections = [
    { title: 'What it is', html: t?.whatIs },
    { title: 'How it works', html: t?.howItWorks },
    { title: 'When to use it', html: t?.whenToUse },
  ].filter((s) => s.html)

  // video gratis visibili a tutti; i PRO solo ai membri (e solo sulla pagina PRO)
  const canWatch = (access: string) => access === 'FREE' || (pro && isMember)

  return (
    <>
      <section className="tool-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Home</Link> / <Link href={`/${tool.category.slug}`}>{catName}</Link> / {tool.title}
          </div>
          <div className="tool-head">
            <div className="tool-logo">{tool.logoUrl && <img src={tool.logoUrl} alt={`${tool.title} logo`} />}</div>
            <div style={{ flexGrow: 1 }}>
              <h1>{tool.title}</h1>
              {t?.description && <p>{t.description}</p>}
            </div>
            <div className="tool-actions">
              {(tool.refLink || tool.websiteUrl) && (
                <a href={`/go/${tool.id}`} className="btn btn-yellow" rel="sponsored nofollow noopener" target="_blank">
                  Visit {tool.title}
                </a>
              )}
              <Link href={`/${tool.category.slug}`} className="btn btn-outline">
                All {catName.toLowerCase()}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container tool-body">
        <div className="prose">
          {sections.map((s) => (
            <div key={s.title} className="sec">
              <h2>{s.title}</h2>
              {/* contenuto scritto dall'amministratore (pannello admin o API con chiave) */}
              <div dangerouslySetInnerHTML={{ __html: s.html! }} />
            </div>
          ))}
          {t?.fullDescription && !sections.length && (
            <div className="sec">
              <div dangerouslySetInnerHTML={{ __html: t.fullDescription }} />
            </div>
          )}

          {tool.videos.length > 0 && (
            <>
              <h2 style={{ marginBottom: 20 }}>Video tutorials</h2>
              <div className="videos">
                {tool.videos.map((v) => {
                  const embed = youtubeEmbed(v.youtubeUrl)
                  const title = v.titleEn ?? 'Video tutorial'
                  return (
                    <div key={v.id}>
                      {canWatch(v.access) && embed ? (
                        <div className="video-frame">
                          <iframe src={embed} title={title} loading="lazy" allowFullScreen />
                        </div>
                      ) : (
                        <div className="video-locked">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffd300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="4" y="11" width="16" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                          </svg>
                          <b>Included with PRO</b>
                          <Link href="/signup?plan=pro" className="btn btn-yellow btn-sm">
                            Get PRO for {PRO_PRICE_LABEL}
                          </Link>
                        </div>
                      )}
                      <div className="video-title">{title}</div>
                      <div className="video-note">{v.access === 'FREE' ? 'Free to watch' : 'PRO members'}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <aside className="side">
          {facts.length > 0 && (
            <div className="facts">
              <h2>Key facts</h2>
              <div className="list">
                {facts.map((f) => (
                  <div key={f.label} className="fact">
                    <span>{f.label}</span>
                    <span>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tool.category.tools.length > 0 && (
            <div className="more-box">
              <h2>More {catName.toLowerCase()}</h2>
              {tool.category.tools.map((o) => (
                <Link key={o.id} href={`${base}/${o.slug}`}>
                  {o.title}
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      <section className="cta-band" style={{ marginTop: 0 }}>
        <div className="container">
          <div>
            <h2>Unlock every video tutorial with PRO</h2>
            <p>{PRO_PRICE_LABEL}, cancel any time.</p>
          </div>
          <Link href="/signup?plan=pro" className="btn btn-black">
            Get PRO
          </Link>
        </div>
      </section>
    </>
  )
}
