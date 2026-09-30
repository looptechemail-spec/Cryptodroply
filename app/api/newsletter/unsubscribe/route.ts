import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readToken } from '@/lib/auth'

export async function GET(req: Request) {
  const data = readToken(new URL(req.url).searchParams.get('t'))
  if (!data || data.act !== 'unsub') return NextResponse.redirect(new URL('/newsletter?status=invalid', req.url))
  await db.subscriber.update({ where: { id: data.sub }, data: { unsubscribedAt: new Date() } }).catch(() => undefined)
  return NextResponse.redirect(new URL('/newsletter?status=unsubscribed', req.url))
}
