import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/v1'

export const dynamic = 'force-dynamic'

const item = z.object({
  channel: z.enum(['telegram', 'x', 'instagram', 'tiktok', 'other']),
  text: z.string().min(3).max(4000), linkUrl: z.string().url().optional(), imageUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional(),
})

/** Crea una o più bozze di post social. Restano in DRAFT finché l'admin non li approva da Admin > Social. */
export async function POST(req: Request) {
  if (!guard(req)) return unauthorized()
  const json = await req.json().catch(() => null)
  const p = z.array(item).max(50).safeParse(Array.isArray(json) ? json : [json])
  if (!p.success) return NextResponse.json({ error: p.error.flatten() }, { status: 400 })
  const rows = await Promise.all(p.data.map((x) => db.socialPost.create({ data: { ...x, scheduledAt: x.scheduledAt ? new Date(x.scheduledAt) : null } })))
  return NextResponse.json({ created: rows.map((r) => r.id), review: '/admin/social' })
}

/** n8n: legge i post APPROVATI il cui orario è arrivato (?channel=telegram per filtrare). */
export async function GET(req: Request) {
  if (!guard(req)) return unauthorized()
  const channel = new URL(req.url).searchParams.get('channel') ?? undefined
  const rows = await db.socialPost.findMany({
    where: { status: 'APPROVED', channel, OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
    orderBy: { scheduledAt: 'asc' }, take: 50,
  })
  return NextResponse.json(rows)
}

/** n8n: segna un post come pubblicato. Body: { id, status: "SENT" } */
export async function PATCH(req: Request) {
  if (!guard(req)) return unauthorized()
  const p = z.object({ id: z.string(), status: z.enum(['SENT', 'APPROVED']) }).safeParse(await req.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: p.error.flatten() }, { status: 400 })
  await db.socialPost.update({ where: { id: p.data.id }, data: { status: p.data.status, sentAt: p.data.status === 'SENT' ? new Date() : null } })
  return NextResponse.json({ ok: true })
}
