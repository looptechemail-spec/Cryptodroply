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
  return [
    { url: `${base}/` },
    { url: `${base}/blog` },
    ...['privacy-policy', 'cookie-policy', 'terms', 'disclaimer'].map((l) => ({ url: `${base}/${l}` })),
    { url: `${base}/best` },
    ...seo.map((p) => ({ url: `${base}/best/${p.slug}`, lastModified: p.updatedAt })),
    ...categories.map((c) => ({ url: `${base}/${c.slug}` })),
    ...tools.map((t) => ({ url: `${base}/${t.category.slug}/${t.slug}`, lastModified: t.updatedAt })),
    ...posts.map((p) => ({ url: `${base}/post/${p.slug}`, lastModified: p.updatedAt })),
  ]
}
