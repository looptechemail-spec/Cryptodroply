import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { purchaseEmail, renewalEmail, paymentFailedEmail, canceledEmail } from '@/lib/emails'
import { COMMISSION_RATE, RECURRING } from '@/lib/referral'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'> = {
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  unpaid: 'PAST_DUE',
  canceled: 'CANCELED',
  incomplete: 'INCOMPLETE',
  incomplete_expired: 'CANCELED',
  paused: 'CANCELED',
}

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const user = await db.user.findUnique({ where: { stripeCustomerId: customerId } })
  if (!user) return
  const s = sub as any
  const periodEnd: number | undefined = s.current_period_end ?? s.items?.data?.[0]?.current_period_end
  const data = {
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? '',
    status: STATUS[sub.status] ?? 'INCOMPLETE',
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  }
  const before = await db.subscription.findUnique({ where: { userId: user.id } })
  await db.subscription.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } })
  // email di disdetta: solo la prima volta che l'abbonamento passa a "non si rinnova"
  const nowEnding = sub.cancel_at_period_end || sub.status === 'canceled'
  if (nowEnding && !(before?.cancelAtPeriodEnd || before?.status === 'CANCELED')) await canceledEmail(user.email, user.name, data.currentPeriodEnd)
}

async function userOf(customer: unknown) {
  const id = typeof customer === 'string' ? customer : (customer as { id?: string } | null)?.id
  return id ? db.user.findUnique({ where: { stripeCustomerId: id } }) : null
}

/** Email di acquisto (primo pagamento) o di rinnovo (pagamenti successivi). */
async function notifyInvoice(inv: Stripe.Invoice) {
  if (!inv.amount_paid || inv.amount_paid <= 0) return
  const u = await userOf(inv.customer)
  if (!u) return
  const sub = await db.subscription.findUnique({ where: { userId: u.id } })
  const next = sub?.currentPeriodEnd ?? null
  if (inv.billing_reason === 'subscription_create') await purchaseEmail(u.email, u.name, inv.amount_paid, inv.currency, next)
  else if (inv.billing_reason === 'subscription_cycle') await renewalEmail(u.email, u.name, inv.amount_paid, inv.currency, next)
}

/** Commissione referral su un pagamento riuscito (una sola volta per fattura). */
async function commissionForInvoice(inv: Stripe.Invoice) {
  const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id
  if (!customerId || !inv.id) return
  const buyer = await db.user.findUnique({ where: { stripeCustomerId: customerId } })
  if (!buyer?.referredById || buyer.referredById === buyer.id) return
  if (!RECURRING && inv.billing_reason !== 'subscription_create') return
  const base = (inv as any).total_excluding_tax ?? inv.amount_paid
  if (!base || base <= 0) return
  await db.commission
    .create({ data: { earnerId: buyer.referredById, sourceUserId: buyer.id, stripeInvoiceId: inv.id, baseCents: base, amountCents: Math.floor(base * COMMISSION_RATE) } })
    .catch(() => undefined) // fattura già registrata
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers.get('stripe-signature')
  if (!secret || !signature) return new NextResponse('Webhook non configurato', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret)
  } catch {
    return new NextResponse('Firma non valida', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.client_reference_id && typeof session.customer === 'string') {
      await db.user.update({ where: { id: session.client_reference_id }, data: { stripeCustomerId: session.customer } }).catch(() => undefined)
    }
    if (typeof session.subscription === 'string') await syncSubscription(await stripe().subscriptions.retrieve(session.subscription))
  } else if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await syncSubscription(event.data.object as Stripe.Subscription)
  } else if (event.type === 'invoice.paid') {
    const inv = event.data.object as Stripe.Invoice
    await commissionForInvoice(inv)
    await notifyInvoice(inv)
  } else if (event.type === 'invoice.payment_failed') {
    const inv = event.data.object as Stripe.Invoice
    const u = await userOf(inv.customer)
    if (u) await paymentFailedEmail(u.email, u.name)
  } else if (event.type === 'charge.refunded') {
    const inv = (event.data.object as any).invoice
    const id = typeof inv === 'string' ? inv : inv?.id
    if (id) await db.commission.updateMany({ where: { stripeInvoiceId: id, status: 'PENDING' }, data: { status: 'VOID' } })
  }
  return NextResponse.json({ received: true })
}
