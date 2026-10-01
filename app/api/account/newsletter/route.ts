import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { absUrl } from '@/lib/url'

/** Il form dell'account iscrive (già confermato: l'email è quella dell'account) o disiscrive. */
export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(absUrl('/login', req), 303)
  const on = String((await req.formData()).get('on') ?? '') === '1'
  const email = user.email.toLowerCase()
  if (on) {
    await db.subscriber.upsert({
      where: { email },
      update: { unsubscribedAt: null, confirmedAt: new Date() },
      create: { email, locale: user.locale, source: 'account', consentAt: new Date(), confirmedAt: new Date() },
    })
  } else {
    await db.subscriber.updateMany({ where: { email }, data: { unsubscribedAt: new Date() } })
  }
  return NextResponse.redirect(absUrl('/account?saved=newsletter', req), 303)
}
