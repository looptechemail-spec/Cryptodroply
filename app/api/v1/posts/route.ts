import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guard, draftGuard, unauthorized, slugify } from '@/lib/v1'
import { apiKeyOk } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const tr = z.object({
  title: z.string(), excerpt: z.string().optional(), contentMd: z.string(),
  seoTitle: z.string().optional(), seoDescription: z.string().optional(),
})
const body = z.object({
  slug: z.string().optional(), access: z.enum(['FREE', 'PRO']).default('FREE'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'), coverUrl: z.string().optional(),
  featured: z.boolean().optional(), category: z.string().optional(),
  translations: z.object({ EN: tr.optional(), IT: tr.optional() }),
})

export async function GET(req: Request) {
  if (!guard(req)) return unauthorized()
  const rows = await db.post.findMany({
    orderBy: { publishedAt: 'desc' }, take: 200,
    select: { id: true, slug: true, access: true, status: true, publishedAt: true, translations: { select: { locale: true, title: true } } },
  })
  return NextResponse.json(rows)
}

/** Crea o aggiorna un articolo (chiave: slug). Gli articoli PRO sono le "analisi". */
export async function POST(req: Request) {
  if (!draftGuard(req)) return unauthorized()
  const p = body.safeParse(await req.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: p.error.flatten() }, { status: 400 })
  let b = p.data
  if (!apiKeyOk(req)) {
    // chiave limitata: solo bozze gratuite nuove, mai pubblicare né toccare articoli già online
    b = { ...b, status: 'DRAFT', access: 'FREE', featured: undefined }
    const slugCheck = b.slug ?? slugify((b.translations.EN ?? b.translations.IT)?.title ?? '')
    const existing = slugCheck ? await db.post.findUnique({ where: { slug: slugCheck }, select: { status: true } }) : null
    if (existing && existing.status === 'PUBLISHED') return NextResponse.json({ error: 'articolo già pubblicato, non modificabile con questa chiave' }, { status: 403 })
  }
  const main = b.translations.EN ?? b.translations.IT
  if (!main) return NextResponse.json({ error: 'serve almeno una traduzione' }, { status: 400 })
  const slug = b.slug ?? slugify(main.title)
  const cat = b.category ? await db.postCategory.findUnique({ where: { slug: b.category } }) : null
  const data = {
    access: b.access, status: b.status, coverUrl: b.coverUrl, featured: b.featured, categoryId: cat?.id ?? null,
    ...(b.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
  }
  const post = await db.post.upsert({
    where: { slug }, update: data, create: { ...data, slug, legacyPath: `/post/${slug}` },
  })
  for (const loc of ['EN', 'IT'] as const) {
    const t = b.translations[loc]
    if (!t) continue
    await db.postTranslation.upsert({
      where: { postId_locale: { postId: post.id, locale: loc } },
      update: t, create: { postId: post.id, locale: loc, ...t },
    })
  }
  return NextResponse.json({ id: post.id, slug, url: `/post/${slug}` })
}
