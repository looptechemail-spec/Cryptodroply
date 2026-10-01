import { db } from '@/lib/db'
import { analyze, type Tag, type Facet } from '@/lib/tags'

export type CategoryInfo = { id: string; slug: string; wixId: string | null; name: string; count: number }

/** Categorie con nome inglese e numero di tool pubblicati. */
export async function getCategories(): Promise<CategoryInfo[]> {
  const rows = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      translations: { where: { locale: 'EN' } },
      _count: { select: { tools: { where: { status: 'PUBLISHED' } } } },
    },
  })
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    wixId: c.wixId,
    name: c.translations[0]?.name ?? c.slug,
    count: c._count.tools,
  }))
}

/** Il testo di un tool/articolo nella lingua richiesta, con ripiego sull'inglese. */
export function pick<T extends { locale: string }>(list: T[], locale = 'EN'): T | undefined {
  return list.find((t) => t.locale === locale) ?? list.find((t) => t.locale === 'EN') ?? list[0]
}

export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null
}

export type AppTool = {
  id: string
  slug: string
  title: string
  logoUrl: string | null
  coverUrl: string | null
  description: string | null
  categorySlug: string
  categoryName: string
  tags?: Tag[]
  vals?: Record<string, string[]>
}

/** I tool pubblicati di una sezione, nel formato usato dalle schede "app store", con tag e filtri per categoria. */
export async function getSectionData(collections: string[], take = 12): Promise<{ tools: AppTool[]; facets: Record<string, Facet[]> }> {
  const rows = await db.tool.findMany({
    where: { status: 'PUBLISHED', category: { wixId: { in: collections } } },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    take,
    include: { translations: true, category: { include: { translations: true, attributes: { orderBy: { sortOrder: 'asc' } } } } },
  })
  const facets: Record<string, Facet[]> = {}
  const info: Record<string, { tags: Tag[]; vals: Record<string, string[]> }> = {}
  for (const slug of new Set(rows.map((r) => r.category.slug))) {
    const group = rows.filter((r) => r.category.slug === slug)
    const a = analyze(group[0].category.attributes, group.map((r) => ({ id: r.id, attributes: r.attributes })))
    facets[slug] = a.facets
    Object.assign(info, a.tools)
  }
  const tools = rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    logoUrl: t.logoUrl,
    coverUrl: t.coverUrl,
    description: pick(t.translations)?.description ?? null,
    categorySlug: t.category.slug,
    categoryName: pick(t.category.translations)?.name ?? t.category.slug,
    tags: info[t.id]?.tags ?? [],
    vals: info[t.id]?.vals ?? {},
  }))
  return { tools, facets }
}

export async function getSectionTools(collections: string[], take = 12): Promise<AppTool[]> {
  return (await getSectionData(collections, take)).tools
}
