import Stripe from 'stripe'

let client: Stripe | null = null

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY non impostata')
  return (client ??= new Stripe(key))
}

export const stripeReady = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_PRO_MONTHLY
