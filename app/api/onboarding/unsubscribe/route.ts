import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { db } from '@/lib/db'
import { readToken } from '@/lib/auth'

/** Chi si è registrato può fermare le email di benvenuto con un clic. */
export async function GET(req: Request) {
  const data = readToken(new URL(req.url).searchParams.get('t'))
  if (!data || data.act !== 'ob-unsub') return NextResponse.redirect(absUrl('/newsletter?status=invalid', req))
  if (data.uid && data.uid !== 'preview') await db.emailSent.create({ data: { subscriberId: String(data.uid), step: 'onboarding-optout' } }).catch(() => undefined)
  return NextResponse.redirect(absUrl('/newsletter?status=unsubscribed', req))
}
