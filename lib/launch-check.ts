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
  add('Indirizzo del sito (SITE_URL)', site.replace(/\/+$/, '') === 'https://www.cryptodroply.com' ? 'ok' : 'bad', site || 'non impostato. Deve essere https://www.cryptodroply.com')

  // Stripe
  const sk = process.env.STRIPE_SECRET_KEY ?? ''
  if (!sk) add('Chiave Stripe', 'bad', 'STRIPE_SECRET_KEY manca')
  else {
    const live = sk.startsWith('sk_live_') || sk.startsWith('rk_live_')
    add('Modalità Stripe', live ? 'ok' : 'bad', live ? 'LIVE: pagamenti reali' : 'TEST: i pagamenti non sono reali. Usa la chiave live prima di aprire ai clienti.')
    const auth = { Authorization: `Bearer ${sk}` }
    const price = process.env.STRIPE_PRICE_PRO_MONTHLY
    if (!price) add('Prezzo Stripe', 'bad', 'STRIPE_PRICE_PRO_MONTHLY manca')
    else {
      const r = await get(`https://api.stripe.com/v1/prices/${price}`, auth).catch(() => null)
      if (!r?.ok) add('Prezzo Stripe', 'bad', `Stripe non trova questo prezzo con questa chiave (${r?.json?.error?.message ?? 'nessuna risposta'}). I prezzi test e live sono diversi.`)
      else {
        const p = r.json
        const good = p.active && p.unit_amount === 1400 && p.currency === 'eur' && p.recurring?.interval === 'month'
        add('Prezzo Stripe', good ? 'ok' : 'warn', `${(p.unit_amount ?? 0) / 100} ${String(p.currency).toUpperCase()} ogni ${p.recurring?.interval ?? '?'}, ${p.active ? 'attivo' : 'NON attivo'}, ${p.livemode ? 'live' : 'test'}`)
      }
    }
    add('Segreto webhook Stripe', process.env.STRIPE_WEBHOOK_SECRET ? 'ok' : 'bad', process.env.STRIPE_WEBHOOK_SECRET ? 'impostato' : 'STRIPE_WEBHOOK_SECRET manca')
    const w = await get('https://api.stripe.com/v1/webhook_endpoints?limit=20', auth).catch(() => null)
    if (!w?.ok) add('Endpoint webhook Stripe', 'warn', 'Non riesco a leggere gli endpoint (la chiave potrebbe essere limitata). Controlla nella dashboard di Stripe.')
    else {
      const eps: any[] = w.json.data ?? []
      const mine = eps.find((e) => String(e.url).startsWith('https://www.cryptodroply.com/api/stripe/webhook'))
      const need = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed', 'charge.refunded']
      if (!mine) add('Endpoint webhook Stripe', 'bad', `Nessun endpoint per https://www.cryptodroply.com/api/stripe/webhook in questa modalità Stripe. Trovati: ${eps.map((e) => e.url).join(', ') || 'nessuno'}`)
      else {
        const have: string[] = mine.enabled_events ?? []
        const miss = have.includes('*') ? [] : need.filter((n) => !have.includes(n))
        add('Endpoint webhook Stripe', miss.length || mine.status !== 'enabled' ? 'warn' : 'ok', miss.length ? `Eventi mancanti: ${miss.join(', ')}` : `attivo, tutti i ${need.length} eventi`)
      }
    }
  }

  // Email
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) add('Invio email', 'bad', 'RESEND_API_KEY o EMAIL_FROM manca')
  else {
    const d = await get('https://api.resend.com/domains', { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }).catch(() => null)
    const from = process.env.EMAIL_FROM ?? ''
    const fromDomain = (from.match(/@([^>\s]+)/)?.[1] ?? '').toLowerCase()
    if (!d?.ok) {
      // le chiavi "solo invio" non possono leggere l'elenco dei domini: non vuol dire che sia sbagliato
      add('Invio email', 'warn', `La chiave Resend non può elencare i domini (${d?.status ?? 'nessuna risposta'}: potrebbe essere una chiave solo invio). Mittente: ${from}. Controlla su Resend che ${fromDomain || 'il dominio del mittente'} sia Verified, poi manda una prova da Admin > Vecchi contatti.`)
    } else {
      const list: any[] = d.json?.data ?? []
      const dom = list.find((x) => x.name === fromDomain || fromDomain.endsWith('.' + x.name))
      if (dom) add('Invio email', dom.status === 'verified' ? 'ok' : 'bad', `${dom.name} è ${dom.status} su Resend. Mittente: ${from}`)
      else add('Invio email', 'bad', `Il mittente ${from || '(EMAIL_FROM manca)'} usa ${fromDomain || '?'} ma questa chiave Resend vede solo: ${list.map((x) => `${x.name} (${x.status})`).join(', ') || 'nessun dominio'}. Usa un mittente su uno di questi domini, oppure la chiave dell’account Resend giusto.`)
    }
  }

  // Publer, automazioni
  add('Publer', process.env.PUBLER_API_KEY ? 'ok' : 'warn', process.env.PUBLER_API_KEY ? 'chiave impostata' : 'PUBLER_API_KEY manca')
  add('Automazione AI', process.env.ANTHROPIC_API_KEY ? 'ok' : 'warn', process.env.ANTHROPIC_API_KEY ? `chiave impostata, bozze automatiche ${process.env.AUTOMATION_ENABLED === 'true' ? 'ATTIVE' : 'DISATTIVATE'}` : 'ANTHROPIC_API_KEY manca')

  // Contenuti
  const left = await wixImageLeft().catch(() => -1)
  add('Immagini ancora su Wix', left === 0 ? 'ok' : 'warn', left === 0 ? 'nessuna, tutte le immagini sono su questo sito' : left < 0 ? 'impossibile contare' : `${left} elementi puntano ancora a Wix. Vengono copiati a ogni riavvio.`)
  const [tools, posts, seoPub] = await Promise.all([db.tool.count({ where: { status: 'PUBLISHED' } }), db.post.count({ where: { status: 'PUBLISHED' } }), db.seoPage.count({ where: { status: 'PUBLISHED' } })])
  add('Contenuti', 'ok', `${tools} strumenti, ${posts} articoli, ${seoPub} pagine SEO pubblicate`)
  return out
}
