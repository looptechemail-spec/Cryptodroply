import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { stripe, stripeReady } from '@/lib/stripe'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user?.stripeCustomerId || !stripeReady()) return NextResponse.redirect(new URL('/account', req.url), 303)
  const site = (process.env.SITE_URL ?? new URL(req.url).origin).replace(/\/$/, '')
  const session = await stripe().billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${site}/account` })
  return NextResponse.redirect(session.url, 303)
}
