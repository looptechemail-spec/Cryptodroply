/** Testi delle email del sito: funzioni pure, usate sia per l'invio vero sia per l'anteprima in admin. */
import { siteUrl, emailShell, button } from './email'
import { signToken } from './auth'

export type Mail = { subject: string; html: string }

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const hello = (name?: string | null) => (name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi,')
const fmtDate = (d?: Date | null) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const euro = (cents: number, cur = 'eur') => new Intl.NumberFormat('en-IE', { style: 'currency', currency: cur.toUpperCase() }).format(cents / 100)

/** Dove porta il pulsante "prendi PRO": la pagina account, che mostra il pagamento Stripe. */
export const proUrl = () => `${siteUrl()}/account?checkout=1`

/** Le email di benvenuto per chi si registra hanno un link per non riceverne altre. */
const obShell = (body: string, uid?: string) => {
  const u = `${siteUrl()}/api/onboarding/unsubscribe?t=${signToken({ uid: uid ?? 'preview', act: 'ob-unsub' }, 60 * 60 * 24 * 365)}`
  return emailShell(`${body}<hr style="border:0;border-top:1px solid #eee;margin:28px 0 12px"><p style="font-size:12px;color:#777">You receive this short series because you created an account on cryptodroply.com. <a href="${u}">Stop these emails</a>.</p>`)
}

const proBox = `<div style="background:#f5f6fa;border-radius:14px;padding:16px;margin:18px 0"><b>Cryptodroply PRO, 14 euro per month, cancel any time</b><ul style="margin:8px 0 0;padding-left:18px"><li>The <b>Grow</b> section: staking, lending, launchpads and trading platforms</li><li>The <b>Privacy</b> section: tools to buy, hold and spend with more privacy</li><li>The <b>weekly crypto analyses</b>, in full</li></ul></div>`

// ---- Benvenuto per chi si registra: 3 email, tutte con il pulsante per prendere PRO ----
export const tplWelcome = (name?: string | null, uid?: string): Mail => ({
  subject: 'Welcome to Cryptodroply, your account is ready',
  html: obShell(`<h2>Welcome to Cryptodroply</h2><p>${hello(name)}</p><p>Your account is ready. Here is how to get the most out of it:</p><ul><li><b>Browse the tools</b> by category, each one with a plain guide: what it is, how it works, when to use it.</li><li><b>Save your favorites</b> with the heart, so you find them again in your account.</li><li><b>Read the free guides</b> in the blog.</li></ul><p>Want the full picture? PRO opens the sections that are locked:</p>${proBox}${button(proUrl(), 'Get PRO')}<p>If you need help, just reply to this email.</p>`, uid),
})

export const tplOnboarding2 = (name?: string | null, uid?: string): Mail => ({
  subject: 'What PRO members see that you do not (yet)',
  html: obShell(`<h2>What is behind the PRO lock</h2><p>${hello(name)}</p><p>Free members can explore wallets, exchanges, free earn and security tools. PRO members go further:</p><ul><li><b>Grow</b>: where to put crypto to work, with a plain guide for each platform and what to watch out for.</li><li><b>Privacy</b>: how to buy, hold and spend with more privacy.</li><li><b>Weekly analyses</b>: one clear read of what is happening, every week, in full.</li></ul><p>One plan, <b>14 euro per month</b>. No contract: you cancel from your account whenever you want.</p>${button(proUrl(), 'Start PRO')}`, uid),
})

export const tplOnboarding3 = (name?: string | null, uid?: string): Mail => ({
  subject: 'Your PRO is one click away',
  html: obShell(`<h2>Ready when you are</h2><p>${hello(name)}</p><p>Two reasons people go PRO after looking around for a few days:</p><ol><li><b>They want the whole map</b>: Grow, Privacy and the weekly analyses, not just the free part.</li><li><b>The referral link</b>: PRO members earn <b>30%</b> of every payment from the people they refer, for as long as those people stay subscribed.</li></ol><p>Still 14 euro per month, cancel any time.</p>${button(proUrl(), 'Get PRO')}<p style="font-size:13px;color:#666">This is the last email in this short series. If PRO is not for you, no problem: the free part of Cryptodroply stays free.</p>`, uid),
})

// ---- Abbonamento PRO ----
export const tplPurchase = (name: string | null | undefined, amountCents: number, currency: string, nextDate?: Date | null): Mail => ({
  subject: 'Your Cryptodroply PRO is active',
  html: emailShell(`<h2>You are now a PRO member</h2><p>${hello(name)}</p><p>Thank you! We received your payment of <b>${euro(amountCents, currency)}</b> and PRO is active on your account: Grow, Privacy and the weekly analyses are unlocked.</p>${nextDate ? `<p>Your next payment is on ${fmtDate(nextDate)}. You can cancel any time from your account.</p>` : ''}${button(`${siteUrl()}/s/grow`, 'Open the PRO sections')}<p style="font-size:13px;color:#666">The receipt from Stripe arrives in a separate email.</p>`),
})

export const tplRenewal = (name: string | null | undefined, amountCents: number, currency: string, nextDate?: Date | null): Mail => ({
  subject: 'Your Cryptodroply PRO has been renewed',
  html: emailShell(`<h2>PRO renewed</h2><p>${hello(name)}</p><p>Your monthly payment of <b>${euro(amountCents, currency)}</b> went through and your PRO access continues.</p>${nextDate ? `<p>Next renewal: ${fmtDate(nextDate)}.</p>` : ''}<p>To change or cancel your plan, open your account.</p>${button(`${siteUrl()}/account`, 'Manage my plan')}`),
})

export const tplPaymentFailed = (name?: string | null): Mail => ({
  subject: 'Action needed: your Cryptodroply payment did not go through',
  html: emailShell(`<h2>We could not charge your card</h2><p>${hello(name)}</p><p>The payment for your PRO plan failed. Please update your payment method so your access is not interrupted.</p>${button(`${siteUrl()}/account`, 'Update payment method')}`),
})

export const tplCanceled = (name: string | null | undefined, endsAt?: Date | null): Mail => ({
  subject: 'Your Cryptodroply PRO has been canceled',
  html: emailShell(`<h2>PRO canceled</h2><p>${hello(name)}</p><p>Your PRO plan has been canceled and will not renew.${endsAt ? ` You keep access until <b>${fmtDate(endsAt)}</b>.` : ''}</p><p>You can come back any time. Your account and favorites stay as they are.</p>${button(`${siteUrl()}/pricing`, 'See PRO again')}<p style="font-size:13px;color:#666">If you canceled by mistake or something was missing, reply to this email and tell us.</p>`),
})

// ---- Altre email di sistema ----
export const tplReset = (link: string): Mail => ({
  subject: 'Reset your Cryptodroply password',
  html: emailShell(`<h2>Reset your password</h2><p>Use the button below within one hour.</p>${button(link, 'Choose a new password')}<p style="font-size:13px;color:#666">If you did not ask for this, ignore this email.</p>`),
})

export const tplConfirm = (link: string): Mail => ({
  subject: 'Confirm your subscription to Cryptodroply',
  html: emailShell(`<h2>One more step</h2><p>Confirm your email to get new tools, airdrops and guides from Cryptodroply.</p>${button(link, 'Confirm my email')}<p style="font-size:13px;color:#666">If you did not ask for this, ignore this email and nothing will happen.</p>`),
})

export const tplContact = (d: { topic: string; name: string; email: string; message: string }): Mail => ({
  subject: `New message (${d.topic}) from ${d.name || d.email}`,
  html: `<p><b>${esc(d.name)}</b> &lt;${esc(d.email)}&gt;</p><p>${esc(d.message).replace(/\n/g, '<br>')}</p>`,
})
