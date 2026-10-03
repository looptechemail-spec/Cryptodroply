import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { db } from '@/lib/db'
import { readToken } from '@/lib/auth'

async function handle(req: Request) {
  const data = readToken(new URL(req.url).searchParams.get('t'))
  if (!data || data.act !== 'legacy-unsub') return NextResponse.redirect(absUrl('/newsletter?status=invalid', req))
  await db.legacyContact.update({ where: { id: String(data.legacy) }, data: { optOutAt: new Date() } }).catch(() => undefined)
  return NextResponse.redirect(absUrl('/newsletter?status=unsubscribed', req))
}
export const GET = handle
export const POST = handle
