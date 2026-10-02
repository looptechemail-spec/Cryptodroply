import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import { sec, CATEGORY_NAMES_IT } from '@/lib/sections-it'
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
import { toolTags, labelFor } from '@/lib/tags'
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
  const { it, loc } = await i18n()
  const t = pick(tool.translations, loc)
  const description = t?.seoDescription ?? t?.description ?? undefined
  const seoTitle = it && t?.locale !== 'IT' ? undefined : t?.seoTitle
  // l'anteprima quando il link viene condiviso è il logo dello strumento
  const image = tool.logoUrl ?? tool.coverUrl ?? undefined
  return {
    title: seoTitle ?? (it ? `${tool.title}: cos’è e come si usa` : `${tool.title}: what it is and how to use it`),
    description,
    openGraph: { title: tool.title, description, images: image ? [image] : undefined },
    twitter: { card: 'summary', title: tool.title, description, images: image ? [image] : undefined },
  }
}

export default async function ToolPage({ params }: Props) {
  const { category, slug } = await params
  const { tool, pro } = await load(category, slug)
  if (!tool) notFound()
  const { t: tr, it, lang, loc } = await i18n()

  const isMember = await hasPro()
  if (isProCollection(tool.category.wixId) && !isMember) {
    return (
      <div className="container">
        <div className="crumbs" style={{ marginTop: 28 }}>
          <Link href="/">Home</Link>
        </div>
        <Paywall title={tr('This tool is for PRO members', 'Questo strumento è riservato a chi ha PRO')} text={tr('The Grow and Privacy sections are included with PRO.', 'Le sezioni Grow e Privacy sono incluse in PRO.')} />
      </div>
    )
  }
  const viewer = await getUser()
  const saved = viewer ? !!(await db.favorite.findUnique({ where: { userId_toolId: { userId: viewer.id, toolId: tool.id } } })) : false
  const t = pick(tool.translations, loc)
  const catName = (it && tool.category.wixId && CATEGORY_NAMES_IT[tool.category.wixId]) || pick(tool.category.translations, loc)?.name || tool.category.slug
  const base = pro ? `/pro-${tool.category.slug}` : `/${tool.category.slug}`
  // in italiano: i valori tradotti (se ci sono) prendono il posto di quelli originali
  const itAttrs = it && t?.locale === 'IT' ? ((t.attributes ?? {}) as Record<string, string>) : {}
  const values = { ...((tool.attributes ?? {}) as Record<string, string>), ...Object.fromEntries(Object.entries(itAttrs).filter(([, v]) => v)) }
  const facts = tool.category.attributes
    .map((a) => ({ label: labelFor(a, lang), value: values[a.key] }))
    .filter((f) => f.value)
  const tags = toolTags(tool.category.attributes, tool.attributes, lang)
  // sotto la scheda: gli altri strumenti della stessa sezione (es. wallet = cold + hot), prima quelli della stessa categoria
  const sectionBase = SECTIONS.find((x) => tool.category.wixId && x.collections.includes(tool.category.wixId))
  const section = sectionBase && sec(sectionBase, it)
  const related = section
    ? (await getSectionTools(section.collections, 60, loc))
        .filter((x) => x.id !== tool.id)
        .sort((a, b) => Number(b.categorySlug === tool.category.slug) - Number(a.categorySlug === tool.category.slug))
        .slice(0, 14)
    : []
  const sections = [
    { title: tr('What it is', 'Cos’è'), html: t?.whatIs },
    { title: tr('How it works', 'Come funziona'), html: t?.howItWorks },
    { title: tr('When to use it', 'Quando usarlo'), html: t?.whenToUse },
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
            <div className="tool-logo">{tool.logoUrl && <img src={tool.logoUrl} alt={tr(`${tool.title} logo`, `Logo di ${tool.title}`)} />}</div>
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
                  {tr(`Visit ${tool.title}`, `Vai a ${tool.title}`)}
                </a>
              )}
              <FavButton toolId={tool.id} initial={saved} loggedIn={!!viewer} />
              <Link href={`/${tool.category.slug}`} className="btn btn-outline">
                {tr(`All ${catName.toLowerCase()}`, `Tutti: ${catName}`)}
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
              <h2 style={{ marginBottom: 20 }}>{tr('Video tutorials', 'Video tutorial')}</h2>
              {canWatch ? (
                <div className="videos">
                  {tool.videos.map((v) => {
                    const embed = youtubeEmbed(v.youtubeUrl)
                    const title = (it ? v.titleIt ?? v.titleEn : v.titleEn) ?? tr('Video tutorial', 'Video tutorial')
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
                  <b>{tr('Video tutorials are free for registered members', 'I video tutorial sono gratuiti per chi ha un account')}</b>
                  <Link href="/signup" className="btn btn-yellow btn-sm">
                    {tr('Create a free account', 'Crea un account gratuito')}
                  </Link>
                  <Link href="/login" className="paywall-login">
                    {tr('Already registered? Log in', 'Hai già un account? Accedi')}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="side">
          {facts.length > 0 && (
            <div className="facts">
              <h2>{tr('Key facts', 'Dati chiave')}</h2>
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
                  {tr('More in', 'Altro in')} {section.title}
                  {section.pro && <span className="badge-pro">PRO</span>}
                </h2>
                <p className="lead" style={{ marginBottom: 0 }}>{section.description}</p>
              </div>
              <Link href={sectionHref(section.key)}>{tr('See all', 'Vedi tutti')}</Link>
            </div>
          </div>
          <div className="rail rail-small" role="list">
            {related.map((x) => (
              <AppCard key={x.id} tool={x} pro={section.pro} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {!viewer && (
        <section className="cta-band" style={{ marginTop: 0 }}>
          <div className="container">
            <div>
              <h2>{tr('Watch the video tutorials, free', 'Guarda i video tutorial, gratis')}</h2>
              <p>{tr('Create a free account to unlock every tutorial.', 'Crea un account gratuito per sbloccare tutti i tutorial.')}</p>
            </div>
            <Link href="/signup" className="btn btn-black">
              {tr('Create a free account', 'Crea un account gratuito')}
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
