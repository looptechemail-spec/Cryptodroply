import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/v1'
import { mainList } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

const body = z.object({ subject: z.string().min(3).max(200), bodyHtml: z.string().min(10) })

/** n8n crea la newsletter come BOZZA: l'invio lo conferma l'admin dal pannello (Admin > Campaigns). */
export async function POST(req: Request) {
  if (!guard(req)) return unauthorized()
  const p = body.safeParse(await req.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: p.error.flatten() }, { status: 400 })
  const list = await mainList()
  const c = await db.campaign.create({ data: { listId: list.id, subject: p.data.subject, bodyHtml: p.data.bodyHtml } })
  return NextResponse.json({ id: c.id, status: 'draft', review: '/admin/newsletter' })
}
