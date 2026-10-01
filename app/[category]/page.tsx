import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import { CATEGORY_INTROS } from '@/lib/sections'
import { AppCard } from '@/components/AppCard'
import { hasPro, isProCollection } from '@/lib/access'
import { Paywall } from '@/components/Paywall'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ category: string }> }

async function load(param: string) {
  const slug = param.startsWith('pro-') ? param.slice(4) : param
  return db.category.findUnique({
    where: { slug },
    include: {
      translations: true,
      tools: {
        where: { status: 'PUBLISHED' },
        orderBy: { sortOrder: 'asc' },
        include: { translations: true },
      },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const c = await load(category)
  const name = c && pick(c.translations)?.name
  if (!name) return {}
  return isProCollection(c?.wixId) ? { title: name, robots: { index: false, follow: false } } : { title: name }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const c = await load(category)
  if (!c) {
    const r = await db.redirect.findUnique({ where: { fromPath: `/${category}` } })
    if (r) permanentRedirect(r.toPath)
    notFound()
  }
  const member = await hasPro()
  const locked = isProCollection(c.wixId) && !member
  const pro = category.startsWith('pro-')
  const base = pro ? `/pro-${c.slug}` : `/${c.slug}`
  const name = pick(c.translations)?.name ?? c.slug

  return (
    <div className="container">
      <div className="page-head">
        <h1>{name}</h1>
        <p className="section-intro">{pick(c.translations)?.description ?? (c.wixId ? CATEGORY_INTROS[c.wixId] : null)}</p>
      </div>
      {locked ? (
        <Paywall title={`${name} is for PRO members`} text="The Grow and Privacy sections are included with PRO." />
      ) : (
      <div className="app-grid" style={{ margin: '32px 0 72px' }}>
        {c.tools.map((t) => (
          <AppCard
            key={t.id}
            base={base}
            pro={pro}
            tool={{
              id: t.id,
              slug: t.slug,
              title: t.title,
              logoUrl: t.logoUrl,
              coverUrl: t.coverUrl,
              description: pick(t.translations)?.description ?? null,
              categorySlug: c.slug,
              categoryName: name,
            }}
          />
        ))}
      </div>
      )}
    </div>
  )
}
