import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readToken } from '@/lib/auth'

export async function GET(req: Request) {
  const data = readToken(new URL(req.url).searchParams.get('t'))
  if (!data || data.act !== 'confirm') return NextResponse.redirect(new URL('/newsletter?status=invalid', req.url))
  const list = await db.newsletterList.upsert({ where: { slug: 'main' }, update: {}, create: { slug: 'main', name: 'Cryptodroply newsletter' } })
  await db.subscriber.update({ where: { id: data.sub }, data: { confirmedAt: new Date(), unsubscribedAt: null } }).catch(() => undefined)
  await db.newsletterMembership
    .upsert({ where: { subscriberId_listId: { subscriberId: data.sub, listId: list.id } }, update: {}, create: { subscriberId: data.sub, listId: list.id } })
    .catch(() => undefined)
  return NextResponse.redirect(new URL('/newsletter?status=confirmed', req.url))
}
