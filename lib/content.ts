import { db } from '@/lib/db'

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
}

/** I tool pubblicati di una sezione, nel formato usato dalle schede "app store". */
export async function getSectionTools(collections: string[], take = 12): Promise<AppTool[]> {
  const rows = await db.tool.findMany({
    where: { status: 'PUBLISHED', category: { wixId: { in: collections } } },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    take,
    include: { translations: true, category: { include: { translations: true } } },
  })
  return rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    logoUrl: t.logoUrl,
    coverUrl: t.coverUrl,
    description: pick(t.translations)?.description ?? null,
    categorySlug: t.category.slug,
    categoryName: pick(t.category.translations)?.name ?? t.category.slug,
  }))
}
