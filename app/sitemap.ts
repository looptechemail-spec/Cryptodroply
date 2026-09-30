import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? 'https://www.cryptodroply.com').replace(/\/$/, '')
  const [categories, tools, posts] = await Promise.all([
    db.category.findMany({ select: { slug: true } }),
    db.tool.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true, category: { select: { slug: true } } } }),
    db.post.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
  ])
  return [
    { url: `${base}/` },
    { url: `${base}/blog` },
    ...categories.map((c) => ({ url: `${base}/${c.slug}` })),
    ...tools.map((t) => ({ url: `${base}/${t.category.slug}/${t.slug}`, lastModified: t.updatedAt })),
    ...posts.map((p) => ({ url: `${base}/post/${p.slug}`, lastModified: p.updatedAt })),
  ]
}
