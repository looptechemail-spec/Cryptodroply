import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/v1'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!guard(req)) return unauthorized()
  const since = (d: number) => new Date(Date.now() - d * 864e5)
  const [tools, posts, users, pro, subs, clicks7, clicks30, top] = await Promise.all([
    db.tool.count({ where: { status: 'PUBLISHED' } }),
    db.post.count({ where: { status: 'PUBLISHED' } }),
    db.user.count(),
    db.subscription.count({ where: { status: { in: ['ACTIVE', 'TRIALING'] } } }),
    db.subscriber.count({ where: { confirmedAt: { not: null }, unsubscribedAt: null } }),
    db.event.count({ where: { kind: 'AFFILIATE_CLICK', createdAt: { gte: since(7) } } }),
    db.event.count({ where: { kind: 'AFFILIATE_CLICK', createdAt: { gte: since(30) } } }),
    db.event.groupBy({ by: ['toolId'], where: { kind: 'AFFILIATE_CLICK', createdAt: { gte: since(30) }, toolId: { not: null } }, _count: { _all: true }, orderBy: { _count: { toolId: 'desc' } }, take: 10 }),
  ])
  const names = await db.tool.findMany({ where: { id: { in: top.map((t) => t.toolId!) } }, select: { id: true, title: true } })
  return NextResponse.json({
    tools, posts, users, proSubscribers: pro, newsletterSubscribers: subs, clicks7, clicks30,
    topTools: top.map((t) => ({ tool: names.find((n) => n.id === t.toolId)?.title, clicks: t._count._all })),
  })
}
