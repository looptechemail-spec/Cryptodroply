import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guard, unauthorized, slugify } from '@/lib/v1'

export const dynamic = 'force-dynamic'

const tr = z.object({
  description: z.string().optional(), fullDescription: z.string().optional(), whatIs: z.string().optional(),
  howItWorks: z.string().optional(), whenToUse: z.string().optional(), tip: z.string().optional(),
  attributes: z.record(z.string()).optional(), seoTitle: z.string().optional(), seoDescription: z.string().optional(),
})
const body = z.object({
  category: z.string(), title: z.string(), slug: z.string().optional(),
  logoUrl: z.string().optional(), coverUrl: z.string().optional(), refLink: z.string().optional(), websiteUrl: z.string().optional(),
  featured: z.boolean().optional(), sponsored: z.boolean().optional(), status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  attributes: z.record(z.string()).optional(),
  translations: z.object({ EN: tr.optional(), IT: tr.optional() }).optional(),
})

/** Elenco (con ?category=slug&q=testo) */
export async function GET(req: Request) {
  if (!guard(req)) return unauthorized()
  const u = new URL(req.url)
  const category = u.searchParams.get('category'), q = u.searchParams.get('q')
  const rows = await db.tool.findMany({
    where: { ...(category ? { category: { slug: category } } : {}), ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}) },
    include: { category: { select: { slug: true } }, translations: true },
    orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }], take: 500,
  })
  return NextResponse.json(rows)
}

/** Crea o aggiorna un tool (chiave: categoria + slug), con traduzioni EN/IT. */
export async function POST(req: Request) {
  if (!guard(req)) return unauthorized()
  const p = body.safeParse(await req.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: p.error.flatten() }, { status: 400 })
  const b = p.data
  const category = await db.category.findUnique({ where: { slug: b.category } })
  if (!category) return NextResponse.json({ error: `categoria "${b.category}" non esiste` }, { status: 404 })
  const slug = b.slug ?? slugify(b.title)
  const data = {
    title: b.title, logoUrl: b.logoUrl, coverUrl: b.coverUrl, refLink: b.refLink, websiteUrl: b.websiteUrl,
    featured: b.featured, sponsored: b.sponsored, status: b.status, attributes: b.attributes,
  }
  const tool = await db.tool.upsert({
    where: { categoryId_slug: { categoryId: category.id, slug } },
    update: data,
    create: { ...data, categoryId: category.id, slug, legacyPath: `/${category.slug}/${slug}`, status: b.status ?? 'PUBLISHED', publishedAt: new Date() },
  })
  for (const loc of ['EN', 'IT'] as const) {
    const t = b.translations?.[loc]
    if (!t) continue
    await db.toolTranslation.upsert({
      where: { toolId_locale: { toolId: tool.id, locale: loc } },
      update: t, create: { toolId: tool.id, locale: loc, ...t },
    })
  }
  return NextResponse.json({ id: tool.id, slug, url: `/${category.slug}/${slug}` })
}

export async function DELETE(req: Request) {
  if (!guard(req)) return unauthorized()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  await db.tool.update({ where: { id }, data: { status: 'DRAFT' } })
  return NextResponse.json({ ok: true, note: 'messo in bozza' })
}
