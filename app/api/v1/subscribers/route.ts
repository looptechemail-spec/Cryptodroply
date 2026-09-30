import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guard, unauthorized } from '@/lib/v1'

export const dynamic = 'force-dynamic'

/** Iscritti confermati e non disiscritti, per le campagne n8n. ?locale=IT|EN, ?since=ISO */
export async function GET(req: Request) {
  if (!guard(req)) return unauthorized()
  const u = new URL(req.url)
  const locale = u.searchParams.get('locale')
  const since = u.searchParams.get('since')
  const rows = await db.subscriber.findMany({
    where: {
      confirmedAt: { not: null }, unsubscribedAt: null,
      ...(locale === 'IT' || locale === 'EN' ? { locale } : {}),
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    },
    select: { email: true, locale: true, source: true, confirmedAt: true },
    orderBy: { createdAt: 'desc' }, take: 5000,
  })
  return NextResponse.json({ count: rows.length, subscribers: rows })
}
