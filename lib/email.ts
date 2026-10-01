/** Invio email con Resend. Senza RESEND_API_KEY non invia nulla e lo scrive nei log. */
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) {
    console.warn(`[email non inviata: RESEND_API_KEY o EMAIL_FROM mancanti] ${opts.subject} -> ${opts.to}`)
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
  })
  if (!res.ok) console.error('[email] Resend ha risposto', res.status, await res.text().catch(() => ''))
  return res.ok
}

export const siteUrl = () => (process.env.SITE_URL ?? 'https://www.cryptodroply.com').replace(/\/$/, '')

export const emailShell = (body: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2b2b2b;line-height:1.55">${body}<p style="margin-top:32px;font-size:13px;color:#666">Cryptodroply</p></div>`

export const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#3c53f4;color:#fff;font-weight:700;padding:14px 26px;border-radius:16px;text-decoration:none">${label}</a></p>`

type Mail = { to: string; subject: string; html: string; headers?: Record<string, string> }

/** Invio a molti destinatari (Resend accetta fino a 100 email per chiamata). Restituisce quante sono partite. */
export async function sendBatch(mails: Mail[]): Promise<number> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) { console.warn('[newsletter non inviata: RESEND_API_KEY o EMAIL_FROM mancanti]'); return 0 }
  let sent = 0
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100)
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map((m) => ({ from, to: m.to, subject: m.subject, html: m.html, headers: m.headers }))),
    })
    if (res.ok) sent += chunk.length
    else console.error('[email] batch Resend', res.status, await res.text().catch(() => ''))
  }
  return sent
}
