/** Contatti del vecchio sito Wix: importazione e invito a registrarsi sul nuovo sito. */
import { db } from './db'
import { sendBatch, siteUrl, emailShell, button } from './email'
import { signToken } from './auth'

const API = 'https://www.wixapis.com'
async function wix(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const key = process.env.WIX_API_KEY, site = process.env.WIX_SITE_ID
  if (!key || !site) throw new Error('WIX_API_KEY o WIX_SITE_ID mancanti')
  const res = await fetch(API + path, {
    method: init.method ?? 'GET',
    headers: { Authorization: key, 'wix-site-id': site, 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  if (!res.ok) throw new Error(`Wix ${res.status} su ${path.split('?')[0]}: ${(await res.text().catch(() => '')).slice(0, 180)}`)
  return res.json()
}

const okEmail = (e: unknown): e is string => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())

export type ImportResult = { contacts: number; added: number; paid: number; skipped: number; notes: string[] }

/** Legge i contatti dal vecchio sito e le persone che hanno pagato un piano; li salva (le email già presenti non si duplicano). */
export async function importLegacyContacts(): Promise<ImportResult> {
  const notes: string[] = []
  const found = new Map<string, { first?: string; last?: string; sub?: string; contactId?: string }>()
  // 1) tutti i contatti
  for (let offset = 0; offset < 200000; offset += 1000) {
    const r = await wix('/contacts/v4/contacts/query', { method: 'POST', body: { query: { paging: { limit: 1000, offset }, fieldsets: ['BASIC', 'COMMUNICATION_DETAILS'] } } })
    const list: any[] = r.contacts ?? []
    for (const c of list) {
      const email = c.primaryInfo?.email ?? c.primaryEmail?.email ?? c.info?.emails?.items?.[0]?.email
      if (!okEmail(email)) continue
      found.set(email.trim().toLowerCase(), { first: c.info?.name?.first, last: c.info?.name?.last, sub: c.primaryEmail?.subscriptionStatus, contactId: c.id })
    }
    if (list.length < 1000) break
  }
  // 2) chi ha pagato un piano
  const paid = new Map<string, string[]>()
  try {
    for (let offset = 0; offset < 20000; offset += 50) {
      const r = await wix(`/pricing-plans/v2/orders?limit=50&offset=${offset}&paymentStatuses=PAID`)
      const orders: any[] = r.orders ?? []
      for (const o of orders) {
        const memberId = o.buyer?.memberId
        if (!memberId) continue
        try {
          const m = await wix(`/members/v1/members/${memberId}`)
          const email = (m.member?.loginEmail ?? m.member?.contact?.emails?.[0] ?? '').toLowerCase()
          if (!okEmail(email)) continue
          paid.set(email, [...(paid.get(email) ?? []), `${o.planName ?? o.planId ?? 'piano'} (${o.status ?? '?'})`])
        } catch (e) { notes.push((e as Error).message.slice(0, 120)) }
      }
      if (orders.length < 50) break
    }
  } catch (e) {
    notes.push(`Piani a pagamento non letti: ${(e as Error).message}`)
  }
  // 3) salvataggio
  let added = 0
  const all = new Set([...found.keys(), ...paid.keys()])
  for (const email of all) {
    const f = found.get(email)
    const p = paid.get(email)
    const row = await db.legacyContact.upsert({
      where: { email },
      update: { ...(p ? { group: 'PAID', planInfo: p.join('; ').slice(0, 300) } : {}), wixSubscribed: f?.sub ?? undefined },
      create: { email, firstName: f?.first ?? null, lastName: f?.last ?? null, group: p ? 'PAID' : 'CONTACT', planInfo: p ? p.join('; ').slice(0, 300) : null, wixSubscribed: f?.sub ?? null },
    })
    if (Date.now() - row.createdAt.getTime() < 60000) added++
  }
  // chi è già registrato sul nuovo sito o si è disiscritto su Wix non va invitato
  const users = await db.user.findMany({ where: { email: { in: [...all] } }, select: { email: true } })
  let skipped = 0
  for (const u of users) { await db.legacyContact.update({ where: { email: u.email }, data: { invitedAt: new Date(0) } }).catch(() => undefined); skipped++ }
  const unsub = await db.legacyContact.updateMany({ where: { wixSubscribed: 'UNSUBSCRIBED', optOutAt: null }, data: { optOutAt: new Date() } })
  skipped += unsub.count
  return { contacts: found.size, added, paid: paid.size, skipped, notes }
}

export async function legacyCounts() {
  const base = { optOutAt: null }
  const [total, contacts, paid, invited, optOut] = await Promise.all([
    db.legacyContact.count(),
    db.legacyContact.count({ where: { ...base, group: 'CONTACT', invitedAt: null } }),
    db.legacyContact.count({ where: { ...base, group: 'PAID', invitedAt: null } }),
    db.legacyContact.count({ where: { invitedAt: { not: null, gt: new Date(1000) } } }),
    db.legacyContact.count({ where: { optOutAt: { not: null } } }),
  ])
  return { total, contacts, paid, invited, optOut }
}

export const DEFAULTS = {
  CONTACT: {
    subject: 'Cryptodroply has a new home: create your free account',
    body: `<p>Hi{name},</p>
<p>Cryptodroply has been rebuilt from scratch: a new site with a guide for every crypto tool, wallets, exchanges, airdrops, privacy and security, now also in Italian.</p>
<p>Your account from the old site did not move over, so please create a new free account with this email address. It takes a minute.</p>
{button}
<p>Ciao{name}, Cryptodroply ha un nuovo sito, più chiaro e anche in italiano. Il tuo vecchio account non è stato trasferito: crea un nuovo account gratuito con questa email, ci vuole un minuto.</p>`,
  },
  PAID: {
    subject: 'Cryptodroply has a new site: sign up again and reactivate your plan',
    body: `<p>Hi{name},</p>
<p>Thank you for supporting Cryptodroply. We have moved to a completely new site, and accounts and payments from the old site could not be transferred.</p>
<p>To keep your PRO access, please create your account again with this email address and reactivate your plan (€14 per month, cancel any time). You get the PRO sections and the weekly analyses.</p>
{button}
<p>Ciao{name}, grazie per aver sostenuto Cryptodroply. Siamo passati a un sito completamente nuovo e account e pagamenti del vecchio sito non si possono trasferire. Per mantenere l’accesso PRO, registrati di nuovo con questa email e riattiva il piano (14 € al mese, disdici quando vuoi).</p>`,
  },
}

const unsubUrl = (id: string) => `${siteUrl()}/api/legacy/unsubscribe?t=${signToken({ legacy: id, act: 'legacy-unsub' }, 60 * 60 * 24 * 365 * 3)}`

function render(group: 'CONTACT' | 'PAID', body: string, c: { id: string; firstName: string | null }) {
  const name = c.firstName ? ` ${c.firstName.replace(/[<>&]/g, '')}` : ''
  const href = `${siteUrl()}/signup${group === 'PAID' ? '?plan=pro' : ''}`
  const label = group === 'PAID' ? 'Sign up again / Registrati di nuovo' : 'Create your free account / Crea l’account gratuito'
  const html = body.replaceAll('{name}', name).replaceAll('{button}', button(href, label))
  return emailShell(`${html}<hr style="border:0;border-top:1px solid #eee;margin:28px 0 12px"><p style="font-size:12px;color:#777">You receive this one-time message because you were in the contacts of the previous Cryptodroply site. We will not write again unless you sign up. <a href="${unsubUrl(c.id)}">Do not contact me / Non contattarmi</a>.</p>`)
}

/** Manda una prova a un indirizzo (non segna nessuno come invitato). */
export async function sendLegacyTest(group: 'CONTACT' | 'PAID', subject: string, body: string, to: string): Promise<boolean> {
  return (await sendBatch([{ to, subject: `[TEST] ${subject}`, html: render(group, body, { id: 'test', firstName: 'Nicolò' }) }])) > 0
}

/** Invia al massimo `limit` inviti non ancora mandati. Ogni persona riceve l'invito una sola volta. */
export async function sendLegacyInvites(group: 'CONTACT' | 'PAID', subject: string, body: string, limit: number): Promise<{ sent: number; picked: number }> {
  const rows = await db.legacyContact.findMany({ where: { group, invitedAt: null, optOutAt: null }, orderBy: { createdAt: 'asc' }, take: limit })
  if (!rows.length) return { sent: 0, picked: 0 }
  // si segnano prima come invitati: se l'invio si interrompe nessuno riceve due volte la stessa email
  await db.legacyContact.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { invitedAt: new Date() } })
  const sent = await sendBatch(rows.map((r) => ({
    to: r.email, subject, html: render(group, body, r),
    headers: { 'List-Unsubscribe': `<${unsubUrl(r.id)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  })))
  if (sent === 0) await db.legacyContact.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { invitedAt: null } })
  return { sent, picked: rows.length }
}
