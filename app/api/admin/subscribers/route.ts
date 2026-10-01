import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAdmin())) return new Response('unauthorized', { status: 401 })
  const rows = await db.subscriber.findMany({ where: { confirmedAt: { not: null }, unsubscribedAt: null }, orderBy: { createdAt: 'asc' } })
  const csv = ['email,language,source,confirmed_at', ...rows.map((r) => `${r.email},${r.locale},${r.source ?? ''},${r.confirmedAt?.toISOString() ?? ''}`)].join('\n')
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="subscribers.csv"' } })
}
