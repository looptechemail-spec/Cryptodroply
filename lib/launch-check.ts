/** Controllo "pronto al lancio": legge le impostazioni e chiede a Stripe, Resend e Publer cosa vedono. Non cambia nulla. */
import { wixImageLeft } from './launch'
import { db } from './db'

export type Check = { label: string; status: 'ok' | 'warn' | 'bad'; detail: string }

const get = async (url: string, headers: Record<string, string>) => {
  const r = await fetch(url, { headers, cache: 'no-store' })
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) as any }
}

export async function launchChecks(): Promise<Check[]> {
  const out: Check[] = []
  const add = (label: string, status: Check['status'], detail: string) => out.push({ label, status, detail })

  const site = process.env.SITE_URL ?? ''
  add('Site address (SITE_URL)', site === 'https://www.cryptodroply.com' ? 'ok' : 'bad', site || 'not set. It must be https://www.cryptodroply.com')

  // Stripe
  const sk = process.env.STRIPE_SECRET_KEY ?? ''
  if (!sk) add('Stripe key', 'bad', 'STRIPE_SECRET_KEY is missing')
  else {
    const live = sk.startsWith('sk_live_') || sk.startsWith('rk_live_')
    add('Stripe mode', live ? 'ok' : 'bad', live ? 'LIVE: real payments' : 'TEST: payments are not real. Use the live key before opening to customers.')
    const auth = { Authorization: `Bearer ${sk}` }
    const price = process.env.STRIPE_PRICE_PRO_MONTHLY
    if (!price) add('Stripe price', 'bad', 'STRIPE_PRICE_PRO_MONTHLY is missing')
    else {
      const r = await get(`https://api.stripe.com/v1/prices/${price}`, auth).catch(() => null)
      if (!r?.ok) add('Stripe price', 'bad', `Stripe does not find this price with this key (${r?.json?.error?.message ?? 'no answer'}). Test and live prices are different.`)
      else {
        const p = r.json
        const good = p.active && p.unit_amount === 1400 && p.currency === 'eur' && p.recurring?.interval === 'month'
        add('Stripe price', good ? 'ok' : 'warn', `${(p.unit_amount ?? 0) / 100} ${String(p.currency).toUpperCase()} per ${p.recurring?.interval ?? '?'}, ${p.active ? 'active' : 'NOT active'}, ${p.livemode ? 'live' : 'test'}`)
      }
    }
    add('Stripe webhook secret', process.env.STRIPE_WEBHOOK_SECRET ? 'ok' : 'bad', process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'STRIPE_WEBHOOK_SECRET is missing')
    const w = await get('https://api.stripe.com/v1/webhook_endpoints?limit=20', auth).catch(() => null)
    if (!w?.ok) add('Stripe webhook endpoint', 'warn', 'Could not read endpoints (the key may be restricted). Check in the Stripe dashboard.')
    else {
      const eps: any[] = w.json.data ?? []
      const mine = eps.find((e) => String(e.url).startsWith('https://www.cryptodroply.com/api/stripe/webhook'))
      const need = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed', 'charge.refunded']
      if (!mine) add('Stripe webhook endpoint', 'bad', `No endpoint for https://www.cryptodroply.com/api/stripe/webhook in this Stripe mode. Found: ${eps.map((e) => e.url).join(', ') || 'none'}`)
      else {
        const have: string[] = mine.enabled_events ?? []
        const miss = have.includes('*') ? [] : need.filter((n) => !have.includes(n))
        add('Stripe webhook endpoint', miss.length || mine.status !== 'enabled' ? 'warn' : 'ok', miss.length ? `Missing events: ${miss.join(', ')}` : `enabled, all ${need.length} events`)
      }
    }
  }

  // Email
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) add('Email sending', 'bad', 'RESEND_API_KEY or EMAIL_FROM is missing')
  else {
    const d = await get('https://api.resend.com/domains', { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }).catch(() => null)
    const dom = (d?.json?.data ?? []).find((x: any) => x.name === 'cryptodroply.com')
    add('Email sending', dom?.status === 'verified' ? 'ok' : 'bad', dom ? `cryptodroply.com is ${dom.status} on Resend. Sender: ${process.env.EMAIL_FROM}` : 'cryptodroply.com not found for this Resend key')
  }

  // Publer, automazioni
  add('Publer', process.env.PUBLER_API_KEY ? 'ok' : 'warn', process.env.PUBLER_API_KEY ? 'key set' : 'PUBLER_API_KEY is missing')
  add('AI automation', process.env.ANTHROPIC_API_KEY ? 'ok' : 'warn', process.env.ANTHROPIC_API_KEY ? `key set, automatic drafts ${process.env.AUTOMATION_ENABLED === 'true' ? 'ON' : 'OFF'}` : 'ANTHROPIC_API_KEY is missing')

  // Contenuti
  const left = await wixImageLeft().catch(() => -1)
  add('Images still on Wix', left === 0 ? 'ok' : 'warn', left === 0 ? 'none, all images are on this site' : left < 0 ? 'could not count' : `${left} records still point to Wix. They are copied at each restart.`)
  const [tools, posts, seoPub] = await Promise.all([db.tool.count({ where: { status: 'PUBLISHED' } }), db.post.count({ where: { status: 'PUBLISHED' } }), db.seoPage.count({ where: { status: 'PUBLISHED' } })])
  add('Content', 'ok', `${tools} tools, ${posts} articles, ${seoPub} published SEO pages`)
  return out
}
