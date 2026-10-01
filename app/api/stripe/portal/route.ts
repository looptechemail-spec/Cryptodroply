import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { getUser } from '@/lib/auth'
import { stripe, stripeReady } from '@/lib/stripe'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user?.stripeCustomerId || !stripeReady()) return NextResponse.redirect(absUrl('/account', req), 303)
  const site = absUrl('/', req).origin.replace(/\/$/, '')
  const session = await stripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${site}/account` })
  return NextResponse.redirect(session.url, 303)
}
