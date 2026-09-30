import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { stripe, stripeReady } from '@/lib/stripe'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(new URL('/signup?plan=pro', req.url), 303)
  if (!stripeReady()) return NextResponse.redirect(new URL('/account?error=stripe', req.url), 303)

  const site = (process.env.SITE_URL ?? new URL(req.url).origin).replace(/\/$/, '')
  let customer = user.stripeCustomerId
  if (!customer) {
    const c = await stripe().customers.create({ email: user.email, name: user.name ?? undefined, metadata: { userId: user.id } })
    customer = c.id
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer } })
  }
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_PRO_MONTHLY!, quantity: 1 }],
    success_url: `${site}/account?welcome=1`,
    cancel_url: `${site}/account`,
    allow_promotion_codes: true,
  })
  return NextResponse.redirect(session.url!, 303)
}
