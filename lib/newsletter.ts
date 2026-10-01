import { db } from './db'
import { sendBatch, siteUrl, emailShell } from './email'
import { signToken } from './auth'
import { cleanText } from './clean'

export async function mainList() {
  return db.newsletterList.upsert({ where: { slug: 'main' }, update: {}, create: { slug: 'main', name: 'Cryptodroply newsletter' } })
}

const unsubLink = (subId: string) => `${siteUrl()}/api/newsletter/unsubscribe?t=${signToken({ sub: subId, act: 'unsub' }, 60 * 60 * 24 * 365 * 3)}`

function wrap(bodyHtml: string, subId: string) {
  const u = unsubLink(subId)
  return emailShell(`${bodyHtml}<hr style="border:0;border-top:1px solid #eee;margin:28px 0 12px"><p style="font-size:12px;color:#777">You receive this because you subscribed on cryptodroply.com. <a href="${u}">Unsubscribe</a>.</p>`)
}

/** Invia la campagna a tutti gli iscritti confermati. Si segna come inviata prima, così non parte due volte. */
export async function sendCampaign(id: string): Promise<{ sent: number; total: number } | null> {
  const claimed = await db.campaign.updateMany({ where: { id, sentAt: null }, data: { sentAt: new Date() } })
  if (!claimed.count) return null
  const c = await db.campaign.findUniqueOrThrow({ where: { id } })
  const subs = await db.subscriber.findMany({ where: { confirmedAt: { not: null }, unsubscribedAt: null }, select: { id: true, email: true } })
  const sent = await sendBatch(subs.map((s) => ({
    to: s.email, subject: c.subject, html: wrap(c.bodyHtml, s.id),
    headers: { 'List-Unsubscribe': `<${unsubLink(s.id)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  })))
  if (sent === 0 && subs.length) await db.campaign.update({ where: { id }, data: { sentAt: null } }) // niente è partito: si può riprovare
  return { sent, total: subs.length }
}

export async function sendTest(id: string, to: string) {
  const c = await db.campaign.findUniqueOrThrow({ where: { id } })
  return sendBatch([{ to, subject: `[TEST] ${c.subject}`, html: wrap(c.bodyHtml, 'test') }])
}

/** Riepilogo settimanale con gli articoli gratuiti pubblicati negli ultimi 7 giorni. Null se non ce ne sono. */
export async function buildDigest(days = 7): Promise<{ subject: string; bodyHtml: string } | null> {
  const since = new Date(Date.now() - days * 86400000)
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED', access: 'FREE', publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' }, take: 8,
    include: { translations: { where: { locale: 'EN' } } },
  })
  const items = posts.filter((p) => p.translations[0])
  if (!items.length) return null
  const li = items.map((p) => {
    const t = p.translations[0]
    const ex = t.excerpt ? `<br><span style="color:#555">${cleanText(t.excerpt).slice(0, 160)}</span>` : ''
    return `<li style="margin-bottom:14px"><a href="${siteUrl()}/post/${p.slug}" style="color:#3c53f4;font-weight:700;text-decoration:none">${cleanText(t.title)}</a>${ex}</li>`
  }).join('')
  return {
    subject: `This week on Cryptodroply: ${cleanText(items[0].translations[0].title)}`,
    bodyHtml: `<h2>This week on Cryptodroply</h2><p>New guides and news for you:</p><ul style="padding-left:18px">${li}</ul><p><a href="${siteUrl()}/blog" style="color:#3c53f4">See all articles</a></p>`,
  }
}
