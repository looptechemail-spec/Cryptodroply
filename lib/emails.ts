/** Email automatiche del sito: registrazione, acquisto, rinnovo, pagamento fallito, disdetta. */
import { sendEmail, siteUrl, emailShell, button } from './email'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const hello = (name?: string | null) => (name ? `Hi ${esc(name.split(' ')[0])},` : 'Hi,')
const fmtDate = (d?: Date | null) => (d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const euro = (cents: number, cur = 'eur') => new Intl.NumberFormat('en-IE', { style: 'currency', currency: cur.toUpperCase() }).format(cents / 100)

export const welcomeEmail = (to: string, name?: string | null) =>
  sendEmail({
    to,
    subject: 'Welcome to Cryptodroply',
    html: emailShell(`<h2>Welcome to Cryptodroply</h2><p>${hello(name)}</p><p>Your account is ready. You can browse every tool, save your favorites and read the free guides. PRO members also get the Grow and Privacy sections and the weekly analyses.</p>${button(`${siteUrl()}/account`, 'Open my account')}<p>If you need help, just reply to this email.</p>`),
  }).catch(() => false)

export const purchaseEmail = (to: string, name: string | null | undefined, amountCents: number, currency: string, nextDate?: Date | null) =>
  sendEmail({
    to,
    subject: 'Your Cryptodroply PRO is active',
    html: emailShell(`<h2>You are now a PRO member</h2><p>${hello(name)}</p><p>Thank you! We received your payment of <b>${euro(amountCents, currency)}</b> and PRO is active on your account: Grow, Privacy and the weekly analyses are unlocked.</p>${nextDate ? `<p>Your next payment is on ${fmtDate(nextDate)}. You can cancel any time from your account.</p>` : ''}${button(`${siteUrl()}/s/grow`, 'Open the PRO sections')}<p style="font-size:13px;color:#666">The receipt from Stripe arrives in a separate email.</p>`),
  }).catch(() => false)

export const renewalEmail = (to: string, name: string | null | undefined, amountCents: number, currency: string, nextDate?: Date | null) =>
  sendEmail({
    to,
    subject: 'Your Cryptodroply PRO has been renewed',
    html: emailShell(`<h2>PRO renewed</h2><p>${hello(name)}</p><p>Your monthly payment of <b>${euro(amountCents, currency)}</b> went through and your PRO access continues.</p>${nextDate ? `<p>Next renewal: ${fmtDate(nextDate)}.</p>` : ''}<p>To change or cancel your plan, open your account.</p>${button(`${siteUrl()}/account`, 'Manage my plan')}`),
  }).catch(() => false)

export const paymentFailedEmail = (to: string, name?: string | null) =>
  sendEmail({
    to,
    subject: 'Action needed: your Cryptodroply payment did not go through',
    html: emailShell(`<h2>We could not charge your card</h2><p>${hello(name)}</p><p>The payment for your PRO plan failed. Please update your payment method so your access is not interrupted.</p>${button(`${siteUrl()}/account`, 'Update payment method')}`),
  }).catch(() => false)

export const canceledEmail = (to: string, name: string | null | undefined, endsAt?: Date | null) =>
  sendEmail({
    to,
    subject: 'Your Cryptodroply PRO has been canceled',
    html: emailShell(`<h2>PRO canceled</h2><p>${hello(name)}</p><p>Your PRO plan has been canceled and will not renew.${endsAt ? ` You keep access until <b>${fmtDate(endsAt)}</b>.` : ''}</p><p>You can come back any time. Your account and favorites stay as they are.</p>${button(`${siteUrl()}/pricing`, 'See PRO again')}<p style="font-size:13px;color:#666">If you canceled by mistake or something was missing, reply to this email and tell us.</p>`),
  }).catch(() => false)
