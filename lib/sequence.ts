/** Sequenza di benvenuto per gli iscritti alla newsletter: giorno 0, 2 e 5. Parte da sola ogni ora, solo se le email sono configurate. */
import { db } from './db'
import { sendEmail, siteUrl, button } from './email'
import { wrap } from './newsletter'
import { cleanText } from './clean'

const DAY = 86400000
const STEPS = [
  { key: 'welcome', day: 0 },
  { key: 'usecase', day: 2 },
  { key: 'pro', day: 5 },
] as const

const link = (href: string, label: string) => `<a href="${siteUrl()}${href}" style="color:#3c53f4;font-weight:700;text-decoration:none">${label}</a>`

async function welcome() {
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED', access: 'FREE' }, orderBy: { publishedAt: 'desc' }, take: 3,
    include: { translations: { where: { locale: 'EN' } } },
  })
  const li = posts.filter((p) => p.translations[0]).map((p) => `<li>${link(`/post/${p.slug}`, cleanText(p.translations[0].title))}</li>`).join('')
  return {
    subject: 'Welcome to Cryptodroply: where to start',
    html: `<h2>Welcome, you are in</h2><p>Cryptodroply is a directory of crypto tools with a plain guide for each one: what it is, how it works and when to use it.</p><p><b>Pick where you want to start:</b></p><ul>
<li>${link('/s/free-earn', 'Free earn')}: airdrops, faucets and tasks to earn crypto without putting money in</li>
<li>${link('/s/wallet', 'Wallet')}: hot and cold wallets to store your crypto</li>
<li>${link('/s/exchange', 'Exchange')}: where to buy, sell and swap</li>
<li>${link('/s/tools', 'Tools')}: security, analysis and spending tools</li></ul>${li ? `<p><b>Latest guides:</b></p><ul>${li}</ul>` : ''}<p>In a couple of days I will send you a short guide on picking your first wallet.</p>`,
  }
}

const usecase = () => ({
  subject: 'How to choose your wallet in 5 minutes',
  html: `<h2>How to choose your wallet in 5 minutes</h2><p>The wallet is where your crypto really lives, so it is the first choice that matters.</p><ol>
<li><b>How much do you hold?</b> Small amounts to try things: a hot wallet (app or browser) is enough. Larger amounts you plan to keep: a cold wallet, a device that keeps your keys offline.</li>
<li><b>Who holds the keys?</b> Choose a wallet where you keep your seed phrase. If someone else holds it, it is not really yours.</li>
<li><b>Write the seed phrase on paper</b> and never type it on a website or share it. No support team will ever ask for it.</li>
<li><b>Check what it supports:</b> the networks and coins you actually plan to use.</li></ol>
<p>Compare wallets with plain explanations and filters here: ${link('/s/wallet', 'browse wallets')}.</p><p>Next time: what you get with PRO, and a free analysis example.</p>`,
})

function teaser(md: string) {
  const words = md.replace(/[#*_>`]|\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim().split(' ')
  return cleanText(words.slice(0, 130).join(' ')) + (words.length > 130 ? '...' : '')
}

async function pro() {
  const slug = process.env.SAMPLE_ANALYSIS_SLUG
  const post =
    (slug ? await db.post.findUnique({ where: { slug }, include: { translations: { where: { locale: 'EN' } } } }) : null) ??
    (await db.post.findFirst({ where: { status: 'PUBLISHED', access: 'PRO' }, orderBy: { publishedAt: 'asc' }, include: { translations: { where: { locale: 'EN' } } } }))
  const t = post?.translations[0]
  const sample = t
    ? `<p><b>A free taste of a PRO analysis:</b></p><div style="background:#f5f6fa;border-radius:14px;padding:16px"><b>${cleanText(t.title)}</b><p style="margin:8px 0 0">${teaser(t.contentMd)}</p></div><p style="font-size:13px;color:#666">This is the beginning of one analysis. PRO members read them in full every week.</p>`
    : ''
  return {
    subject: 'What you get with Cryptodroply PRO',
    html: `<h2>What you get with PRO</h2><p>Everything free stays free. PRO adds:</p><ul><li>The <b>Grow</b> section: staking, lending, launchpads and trading platforms</li><li>The <b>Privacy</b> section: tools to buy, hold and spend with more privacy</li><li>The <b>weekly crypto analyses</b>, in full</li></ul>${sample}<p>It costs 14 euro per month and you can cancel at any time.</p>${button(`${siteUrl()}/pricing`, 'See PRO')}`,
  }
}

export async function tickSequence(log: (m: string) => void = () => {}) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return
  const now = Date.now()
  const subs = await db.subscriber.findMany({
    where: { confirmedAt: { gte: new Date(now - 10 * DAY) }, unsubscribedAt: null },
    select: { id: true, email: true, confirmedAt: true },
    take: 500,
  })
  if (!subs.length) return
  const sent = await db.emailSent.findMany({ where: { subscriberId: { in: subs.map((s) => s.id) } } })
  const done = new Set(sent.map((e) => `${e.subscriberId}:${e.step}`))
  const content: Record<string, () => Promise<{ subject: string; html: string }> | { subject: string; html: string }> = { welcome, usecase, pro }
  for (const s of subs) {
    const age = now - s.confirmedAt!.getTime()
    for (const st of STEPS) {
      if (done.has(`${s.id}:${st.key}`) || age < st.day * DAY || age > (st.day + 4) * DAY) continue
      const c = await content[st.key]()
      const ok = await sendEmail({ to: s.email, subject: c.subject, html: wrap(c.html, s.id) }).catch(() => false)
      if (ok) { await db.emailSent.create({ data: { subscriberId: s.id, step: st.key } }).catch(() => undefined); log(`sequenza ${st.key} -> ${s.email}`) }
      break // un solo passo per giro
    }
  }
}
