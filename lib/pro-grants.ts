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

export const DEFAULT_SUBJECT = 'Your PRO access on the new Cryptodroply / Il tuo accesso PRO sul nuovo Cryptodroply'
export const DEFAULT_BODY = `Hi,
thank you for being a PRO member of Cryptodroply. We have launched the new website and your PRO access is already active on it, you do not need to pay again. Your payments stay on Wix as before, so nothing changes for you.

To use it: open the new site, create your account with THIS email address (or log in if you already did) and you will see all the PRO content: the weekly analyses, the Grow and Privacy sections and the rest.

---

Ciao,
grazie per essere un membro PRO di Cryptodroply. Abbiamo lanciato il nuovo sito e il tuo accesso PRO è già attivo, non devi pagare di nuovo. I pagamenti restano su Wix come prima, quindi per te non cambia nulla.

Per usarlo: apri il nuovo sito, crea l'account con QUESTA email (oppure accedi se l'hai già fatto) e vedrai tutti i contenuti PRO: le analisi settimanali, le sezioni Grow e Privacy e il resto.`

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
      body.split('\n').map((l) => (l.trim() === '---' ? '<hr style="border:0;border-top:1px solid #ddd;margin:20px 0">' : l.trim() ? `<p>${esc(l)}</p>` : '')).join('') +
      button(`${siteUrl()}/signup`, 'Create your account / Crea il tuo account') +
      `<p style="font-size:13px;color:#666">Already registered? <a href="${siteUrl()}/login">Log in / Accedi</a></p>`,
    )
    if (await sendEmail({ to: email, subject, html })) {
      await db.proGrant.update({ where: { email }, data: { notifiedAt: new Date() } })
      sent++
    } else failed.push(email)
  }
  return { granted, sent, failed }
}
