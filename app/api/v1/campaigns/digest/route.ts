import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/v1'
import { buildDigest, mainList } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

/** Crea la bozza del riepilogo settimanale (articoli gratuiti degli ultimi 7 giorni). Se non c'è nulla di nuovo non crea niente. */
export async function POST(req: Request) {
  if (!guard(req)) return unauthorized()
  const d = await buildDigest()
  if (!d) return NextResponse.json({ skipped: 'no new posts' })
  const list = await mainList()
  const c = await db.campaign.create({ data: { listId: list.id, subject: d.subject, bodyHtml: d.bodyHtml } })
  return NextResponse.json({ id: c.id, status: 'draft', subject: d.subject, review: '/admin/newsletter' })
}
