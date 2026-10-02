import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { PRO_COLLECTIONS } from '@/lib/access'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? 'https://www.cryptodroply.com').replace(/\/$/, '')
  const seo = await db.seoPage.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } })
  const [categories, tools, posts] = await Promise.all([
    db.category.findMany({ where: { NOT: { wixId: { in: PRO_COLLECTIONS } } }, select: { slug: true } }),
    db.tool.findMany({ where: { status: 'PUBLISHED', NOT: { category: { wixId: { in: PRO_COLLECTIONS } } } }, select: { slug: true, updatedAt: true, category: { select: { slug: true } } } }),
    db.post.findMany({ where: { status: 'PUBLISHED', access: 'FREE' }, select: { slug: true, updatedAt: true } }),
  ])
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/` },
    { url: `${base}/blog` },
    ...['pricing', 'newsletter', 'contact', 'affiliate'].map((l) => ({ url: `${base}/${l}` })),
    ...['privacy-policy', 'cookie-policy', 'terms', 'disclaimer'].map((l) => ({ url: `${base}/${l}` })),
    { url: `${base}/best` },
    ...seo.map((p) => ({ url: `${base}/best/${p.slug}`, lastModified: p.updatedAt })),
    ...categories.map((c) => ({ url: `${base}/${c.slug}` })),
    ...tools.map((t) => ({ url: `${base}/${t.category.slug}/${t.slug}`, lastModified: t.updatedAt })),
    ...posts.map((p) => ({ url: `${base}/post/${p.slug}`, lastModified: p.updatedAt })),
  ]
  // ogni pagina esiste anche in italiano sotto /it, con i collegamenti hreflang tra le due versioni
  // (le pagine /best sono solo in inglese: restano senza versione italiana)
  return pages.map((p) => {
    if (p.url.startsWith(`${base}/best`)) return p
    const path = p.url.slice(base.length)
    const it = `${base}/it${path === '/' ? '' : path}`
    return { ...p, alternates: { languages: { en: p.url, it } } }
  }).flatMap((p) => {
    if (!p.alternates) return [p]
    return [p, { ...p, url: p.alternates.languages!.it as string }]
  })
}
