/** Email mensile agli abbonati con il loro link referral e le commissioni. Parte il primo giorno del mese, dalle 10 (ora di Roma). */
import { db } from './db'
import { siteUrl, emailShell, button } from './email'
import { flowEnabled, sendFlow } from './email-gate'
import { ensureReferralCode, earnings, euro, MIN_PAYOUT_CENTS } from './referral'

export type ReferralData = { name?: string | null; url: string; referrals: number; lastMonth: number; pending: number; available: number; paid: number }

export const referralHtml = (d: ReferralData) => emailShell(`<h2>Your monthly referral summary</h2><p>${d.name ? `Hi ${d.name.split(' ')[0]},` : 'Hi,'}</p>
<p>You earn <b>30%</b> of every payment from people you refer, for as long as they stay subscribed. Your personal link:</p><p><a href="${d.url}">${d.url}</a></p>
<table style="border-collapse:collapse;margin:12px 0"><tr><td style="padding:4px 16px 4px 0">People you referred</td><td><b>${d.referrals}</b></td></tr>
<tr><td style="padding:4px 16px 4px 0">Earned last month</td><td><b>${euro(d.lastMonth)}</b></td></tr>
<tr><td style="padding:4px 16px 4px 0">Waiting (30 day hold)</td><td><b>${euro(d.pending)}</b></td></tr>
<tr><td style="padding:4px 16px 4px 0">Ready to be paid</td><td><b>${euro(d.available)}</b></td></tr>
<tr><td style="padding:4px 16px 4px 0">Already paid</td><td><b>${euro(d.paid)}</b></td></tr></table>
<p style="font-size:14px;color:#555">Payments start from ${euro(MIN_PAYOUT_CENTS)}. Add your payout details in your account.</p>${button(`${siteUrl()}/account`, 'Open my account')}`)

export async function tickReferralMail(log: (m: string) => void = () => {}) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  if (p.day !== '01' || Number(p.hour) % 24 < 10) return
  if (!(await flowEnabled('referral-monthly'))) return
  const key = `referral-mail-${p.year}-${p.month}`
  try { await db.jobRun.create({ data: { key } }) } catch { return } // già inviata questo mese

  const users = await db.user.findMany({
    where: { subscription: { status: { in: ['ACTIVE', 'TRIALING'] } } },
    select: { id: true, email: true, name: true, referralCode: true },
  })
  const monthStart = new Date(Number(p.year), Number(p.month) - 2, 1) // primo giorno del mese scorso
  const monthEnd = new Date(Number(p.year), Number(p.month) - 1, 1)
  let sent = 0
  for (const u of users) {
    const code = await ensureReferralCode(u.id, u.referralCode)
    const [e, referrals, lastMonth] = await Promise.all([
      earnings(u.id),
      db.user.count({ where: { referredById: u.id } }),
      db.commission.aggregate({ _sum: { amountCents: true }, where: { earnerId: u.id, status: { not: 'VOID' }, createdAt: { gte: monthStart, lt: monthEnd } } }),
    ])
    const url = `${siteUrl()}/r/${code}`
    const html = referralHtml({ name: u.name, url, referrals, lastMonth: lastMonth._sum.amountCents ?? 0, pending: e.pending, available: e.available, paid: e.paid })
    if (await sendFlow('referral-monthly', { to: u.email, subject: 'Your Cryptodroply referral summary', html }).catch(() => false)) sent++
  }
  await db.jobRun.update({ where: { key }, data: { note: `${sent}/${users.length} email` } })
  log(`${key}: ${sent}/${users.length}`)
}
