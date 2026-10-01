import { db } from './db'
import { getSectionData, pick, type AppTool } from './content'
import { CATEGORY_INTROS, SECTIONS } from './sections'
import { PRO_COLLECTIONS } from './access'
import { slugify } from './v1'

const year = () => new Date().getFullYear()
const MIN_TOOLS = 3

/** Crea le bozze: una pagina per categoria e una per ogni caratteristica con almeno 3 strumenti. Non tocca quelle già esistenti. */
export async function generateSeoDrafts(): Promise<{ created: number; skipped: number }> {
  const cats = await db.category.findMany({
    where: { NOT: { wixId: { in: PRO_COLLECTIONS } } },
    include: { translations: true },
  })
  let created = 0, skipped = 0
  const add = async (data: { slug: string; title: string; metaDescription: string; intro: string; categorySlug: string; facetId?: string; facetValue?: string }) => {
    if (await db.seoPage.findUnique({ where: { slug: data.slug } })) { skipped++; return }
    await db.seoPage.create({ data }); created++
  }
  for (const c of cats) {
    const name = pick(c.translations)?.name ?? c.slug
    const { tools, facets } = await getSectionData(c.wixId ? [c.wixId] : [], 300)
    const mine = tools.filter((t) => t.categorySlug === c.slug)
    if (mine.length < MIN_TOOLS) continue
    const base = (c.wixId && CATEGORY_INTROS[c.wixId]) || `A hand picked list of ${name.toLowerCase()} with a plain guide for each one.`
    await add({
      slug: `best-${slugify(name)}`, categorySlug: c.slug, title: `Best ${name} in ${year()}`,
      metaDescription: `Compare ${mine.length} ${name.toLowerCase()} with plain guides: what each one is, how it works and when to use it.`.slice(0, 155),
      intro: `${base}\n\nBelow you find ${mine.length} options. Open each one to read what it is, how it works and when to use it.`,
    })
    for (const f of facets[c.slug] ?? []) {
      for (const o of f.options) {
        if (o.count < MIN_TOOLS || o.count >= mine.length) continue
        const label = f.kind === 'bool' ? `${name} with ${f.label.toLowerCase()}` : `${o.label} ${name}`
        await add({
          slug: `best-${slugify(label)}`, categorySlug: c.slug, facetId: f.id, facetValue: o.value,
          title: `Best ${label} in ${year()}`,
          metaDescription: `${o.count} ${label.toLowerCase()} compared: what each one does, how it works and when to use it.`.slice(0, 155),
          intro: `${base}\n\nThis list shows the ${o.count} ${name.toLowerCase()} that match: ${f.kind === 'bool' ? f.label.toLowerCase() : o.label.toLowerCase()}.`,
        })
      }
    }
  }
  return { created, skipped }
}

export async function toolsForSeoPage(p: { categorySlug: string; facetId: string | null; facetValue: string | null }): Promise<AppTool[]> {
  const cat = await db.category.findUnique({ where: { slug: p.categorySlug }, select: { wixId: true } })
  if (!cat?.wixId || PRO_COLLECTIONS.includes(cat.wixId)) return []
  const { tools } = await getSectionData([cat.wixId], 300)
  return tools.filter((t) => t.categorySlug === p.categorySlug && (!p.facetId || t.vals?.[p.facetId]?.includes(p.facetValue ?? '')))
}

export const sectionOf = (wixId?: string | null) => SECTIONS.find((s) => wixId && s.collections.includes(wixId))
