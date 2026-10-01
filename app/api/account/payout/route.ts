import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { absUrl } from '@/lib/url'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(absUrl('/login', req), 303)
  const v = String((await req.formData()).get('payoutInfo') ?? '').trim().slice(0, 200)
  await db.user.update({ where: { id: user.id }, data: { payoutInfo: v || null } })
  return NextResponse.redirect(absUrl('/account?saved=payout#earn', req), 303)
}
