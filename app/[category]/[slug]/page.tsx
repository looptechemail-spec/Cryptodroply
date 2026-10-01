import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick, youtubeEmbed, getSectionTools } from '@/lib/content'
import { SECTIONS, sectionHref } from '@/lib/sections'
import { AppCard } from '@/components/AppCard'
import { hasPro, isProCollection, PRO_PRICE_LABEL } from '@/lib/access'
import { Paywall } from '@/components/Paywall'
import { getUser } from '@/lib/auth'
import { FavButton } from '@/components/FavButton'
import { toolTags } from '@/lib/tags'
import { cleanText, cleanHtml } from '@/lib/clean'

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
  if (tool) return { tool, pro }
  // vecchi indirizzi (es. categorie unite): si cerca per percorso originale
  const legacy = await db.tool.findFirst({
    where: { status: 'PUBLISHED', OR: [{ legacyPath: `/${categoryParam}/${slug}` }, { legacyProPath: `/${categoryParam}/${slug}` }] },
    include: {
      translations: true,
      videos: { orderBy: { sortOrder: 'asc' } },
      category: { include: { translations: true, attributes: { orderBy: { sortOrder: 'asc' } }, tools: { where: { status: 'PUBLISHED', NOT: { slug } }, take: 3, orderBy: { sortOrder: 'asc' } } } },
    },
  })
  return { tool: legacy, pro }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params
  const { tool } = await load(category, slug)
  if (!tool) return {}
  if (isProCollection(tool.category.wixId)) return { title: tool.title, robots: { index: false, follow: false } }
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
  if (isProCollection(tool.category.wixId) && !isMember) {
    return (
      <div className="container">
        <div className="crumbs" style={{ marginTop: 28 }}>
          <Link href="/">Home</Link>
        </div>
        <Paywall title="This tool is for PRO members" text="The Grow and Privacy sections are included with PRO." />
      </div>
    )
  }
  const viewer = await getUser()
  const saved = viewer ? !!(await db.favorite.findUnique({ where: { userId_toolId: { userId: viewer.id, toolId: tool.id } } })) : false
  const t = pick(tool.translations)
  const catName = pick(tool.category.translations)?.name ?? tool.category.slug
  const base = pro ? `/pro-${tool.category.slug}` : `/${tool.category.slug}`
  const values = (tool.attributes ?? {}) as Record<string, string>
  const facts = tool.category.attributes
    .map((a) => ({ label: a.labelEn, value: values[a.key] }))
    .filter((f) => f.value)
  const tags = toolTags(tool.category.attributes, tool.attributes)
  // sotto la scheda: gli altri strumenti della stessa sezione (es. wallet = cold + hot), prima quelli della stessa categoria
  const section = SECTIONS.find((x) => tool.category.wixId && x.collections.includes(tool.category.wixId))
  const related = section
    ? (await getSectionTools(section.collections, 60))
        .filter((x) => x.id !== tool.id)
        .sort((a, b) => Number(b.categorySlug === tool.category.slug) - Number(a.categorySlug === tool.category.slug))
        .slice(0, 14)
    : []
  const sections = [
    { title: 'What it is', html: t?.whatIs },
    { title: 'How it works', html: t?.howItWorks },
    { title: 'When to use it', html: t?.whenToUse },
  ].filter((s) => s.html)

  // i tutorial sono per chi ha un account (gratuito o PRO); chi non è registrato non li vede
  const canWatch = !!viewer || isMember

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
              {tags.length > 0 && (
                <div className="app-tags hero-tags">
                  {tags.slice(0, 10).map((g) => (
                    <span key={g.label} className="app-tag">
                      <span aria-hidden="true">{g.emoji}</span> {g.label}
                    </span>
                  ))}
                </div>
              )}
              {t?.description && <p>{cleanText(t.description)}</p>}
            </div>
            <div className="tool-actions">
              {(tool.refLink || tool.websiteUrl) && (
                <a href={`/go/${tool.id}`} className="btn btn-yellow" rel="sponsored nofollow noopener" target="_blank">
                  Visit {tool.title}
                </a>
              )}
              <FavButton toolId={tool.id} initial={saved} loggedIn={!!viewer} />
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
              <div dangerouslySetInnerHTML={{ __html: cleanHtml(s.html) }} />
            </div>
          ))}
          {t?.fullDescription && !sections.length && (
            <div className="sec">
              <div dangerouslySetInnerHTML={{ __html: cleanHtml(t.fullDescription) }} />
            </div>
          )}

          {tool.videos.length > 0 && (
            <>
              <h2 style={{ marginBottom: 20 }}>Video tutorials</h2>
              {canWatch ? (
                <div className="videos">
                  {tool.videos.map((v) => {
                    const embed = youtubeEmbed(v.youtubeUrl)
                    const title = v.titleEn ?? 'Video tutorial'
                    return (
                      <div key={v.id}>
                        {embed && (
                          <div className="video-frame">
                            <iframe src={embed} title={title} loading="lazy" allowFullScreen />
                          </div>
                        )}
                        <div className="video-title">{title}</div>
                        {v.description && <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{v.description}</div>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="video-locked" style={{ aspectRatio: 'auto', padding: 36 }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffd300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <b>Video tutorials are free for registered members</b>
                  <Link href="/signup" className="btn btn-yellow btn-sm">
                    Create a free account
                  </Link>
                  <Link href="/login" className="paywall-login">
                    Already registered? Log in
                  </Link>
                </div>
              )}
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
        </aside>
      </div>

      {section && related.length > 0 && (
        <section className="block rail-block">
          <div className="container">
            <div className="row-head">
              <div>
                <h2>
                  More in {section.title}
                  {section.pro && <span className="badge-pro">PRO</span>}
                </h2>
                <p className="lead" style={{ marginBottom: 0 }}>{section.description}</p>
              </div>
              <Link href={sectionHref(section.key)}>See all</Link>
            </div>
          </div>
          <div className="rail rail-small" role="list">
            {related.map((x) => (
              <AppCard key={x.id} tool={x} pro={section.pro} />
            ))}
          </div>
        </section>
      )}

      {!viewer && (
        <section className="cta-band" style={{ marginTop: 0 }}>
          <div className="container">
            <div>
              <h2>Watch the video tutorials, free</h2>
              <p>Create a free account to unlock every tutorial.</p>
            </div>
            <Link href="/signup" className="btn btn-black">
              Create a free account
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
