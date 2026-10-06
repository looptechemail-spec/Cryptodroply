/** Accesso PRO regalato ai clienti del vecchio sito che pagano ancora su Wix. */
import { db } from './db'
import { sendEmail, emailShell, button, siteUrl } from './email'

/** Le prime email consegnate dal proprietario: l'accesso vale subito, l'invito parte solo dal pannello admin. */
export const INITIAL_GRANTS = [
  'dinoro365@gmail.com', 'orsacchiottoverde45@gmail.com', 'gasesposo07@gmail.com',
  'ludovicorizzi@gmail.com', 'paovozz@gmail.com', 'karimelgandy93@gmail.com',
]

export async function seedProGrants(log: (m: string) => void = () => {}) {
  for (const email of INITIAL_GRANTS) {
    await db.proGrant.upsert({ where: { email }, update: {}, create: { email, note: 'cliente vecchio sito (paga su Wix)' } })
  }
  log(`Accessi PRO regalati: ${INITIAL_GRANTS.length}`)
}

export const parseEmails = (raw: string) =>
  [...new Set(raw.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))]

export const DEFAULT_SUBJECT = 'Create your account on the new Cryptodroply to get your PRO plan'
export const DEFAULT_BODY = `Hi,
thank you for being a PRO member of Cryptodroply. We have launched our new website.

To get your PRO plan on it, just create your account with this email address. As soon as you sign up, PRO is active automatically: the weekly analyses, the Grow and Privacy sections and everything else.

Your payments stay on Wix as before, so you do not need to pay again or change anything.`

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Registra gli accessi e manda l'email a chi non l'ha ancora ricevuta. */
export async function grantAndNotify(emails: string[], subject: string, body: string): Promise<{ granted: number; sent: number; failed: string[] }> {
  let granted = 0, sent = 0
  const failed: string[] = []
  for (const email of emails) {
    const g = await db.proGrant.upsert({ where: { email }, update: {}, create: { email, note: 'cliente vecchio sito (paga su Wix)' } })
    granted++
    if (g.notifiedAt) continue
    const html = emailShell(
      body.split('\n').map((l) => (l.trim() ? `<p>${esc(l)}</p>` : '')).join('') +
      button(`${siteUrl()}/signup`, 'Create your account') +
      `<p style="font-size:13px;color:#666">Already registered? <a href="${siteUrl()}/login">Log in</a></p>`,
    )
    if (await sendEmail({ to: email, subject, html })) {
      await db.proGrant.update({ where: { email }, data: { notifiedAt: new Date() } })
      sent++
    } else failed.push(email)
  }
  return { granted, sent, failed }
}

/** Stato dei pagamenti su Wix (che incassa con Stripe) per queste email. Se Wix non risponde restituisce il motivo. */
export async function wixPayments(emails: string[]): Promise<{ map: Map<string, string[]>; error?: string }> {
  const key = process.env.WIX_API_KEY, site = process.env.WIX_SITE_ID
  const map = new Map<string, string[]>()
  if (!key || !site) return { map, error: 'WIX_API_KEY o WIX_SITE_ID mancanti' }
  const call = async (path: string) => {
    const res = await fetch('https://www.wixapis.com' + path, { headers: { Authorization: key, 'wix-site-id': site, 'Content-Type': 'application/json' } })
    if (!res.ok) throw new Error(`Wix ${res.status}: ${(await res.text().catch(() => '')).slice(0, 120)}`)
    return res.json() as Promise<any>
  }
  try {
    const orders: any[] = []
    for (let offset = 0; offset < 5000; offset += 50) {
      const r = await call(`/pricing-plans/v2/orders?limit=50&offset=${offset}`)
      const list: any[] = r.orders ?? []
      orders.push(...list)
      if (list.length < 50) break
    }
    const ids = [...new Set(orders.map((o) => o.buyer?.memberId).filter(Boolean))].slice(0, 400) as string[]
    const emailOf = new Map<string, string>()
    for (let i = 0; i < ids.length; i += 10) {
      await Promise.all(ids.slice(i, i + 10).map(async (id) => {
        try { const m = await call(`/members/v1/members/${id}`); emailOf.set(id, String(m.member?.loginEmail ?? '').toLowerCase()) } catch { /* membro non leggibile */ }
      }))
    }
    const want = new Set(emails)
    for (const o of orders) {
      const e = emailOf.get(o.buyer?.memberId)
      if (!e || !want.has(e)) continue
      const end = o.currentCycle?.endedDate ?? o.endDate ?? o.lastPaymentDate
      map.set(e, [...(map.get(e) ?? []), `${o.planName ?? 'piano'}: ${o.status ?? '?'}${o.lastPaymentStatus ? ', ultimo pagamento ' + o.lastPaymentStatus : ''}${end ? ', fino al ' + String(end).slice(0, 10) : ''}`])
    }
    return { map }
  } catch (e) { return { map, error: (e as Error).message } }
}
