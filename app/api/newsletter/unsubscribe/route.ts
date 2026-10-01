import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { db } from '@/lib/db'
import { readToken } from '@/lib/auth'

export async function GET(req: Request) {
  const data = readToken(new URL(req.url).searchParams.get('t'))
  if (!data || data.act !== 'unsub') return NextResponse.redirect(absUrl('/newsletter?status=invalid', req))
  await db.subscriber.update({ where: { id: data.sub }, data: { unsubscribedAt: new Date() } }).catch(() => undefined)
  return NextResponse.redirect(absUrl('/newsletter?status=unsubscribed', req))
}
