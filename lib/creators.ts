/** YouTuber con video sulle schede: elenco, testo dell'invito e invio. */
import { db } from './db'
import { sendEmail, emailShell, siteUrl } from './email'
import { COMMISSION_RATE } from './referral'

export const STATUSES = ['TO_CONTACT', 'CONTACTED', 'REPLIED', 'PARTNER', 'DECLINED'] as const
export const STATUS_LABEL: Record<string, string> = { TO_CONTACT: 'To contact', CONTACTED: 'Contacted', REPLIED: 'Replied', PARTNER: 'Partner', DECLINED: 'Do not contact' }

export const DEFAULT_SUBJECT = 'Your video is featured on Cryptodroply'
export const DEFAULT_BODY = `Hi {name},

I run Cryptodroply, a directory of crypto tools. Your video is featured on our page for {tools}, with credit to your channel:
{pages}

If you like, there is also a partner program: you get a personal link, and for every member who subscribes through it you receive ${Math.round(COMMISSION_RATE * 100)}% of each payment. Create a free account and open the Affiliate page to get your link: {affiliate}

If you would rather not have your video on the page, or you do not want to hear from me again, just reply to this email and I will take care of it.

Thanks,
Nicolò
Cryptodroply`

export type VideoRef = { toolTitle: string; url: string }

/** Legge da YouTube il canale di ogni video e aggiorna l'elenco (email, note e stato scritti a mano non si toccano). */
export async function syncCreators(): Promise<{ channels: number; added: number; failed: number }> {
  const vids = await db.toolVideo.findMany({ include: { tool: { include: { category: { select: { slug: true } } } } } })
  const byUrl = new Map<string, VideoRef>()
  for (const v of vids) if (v.youtubeUrl) byUrl.set(v.youtubeUrl, { toolTitle: v.tool.title, url: `${siteUrl()}/${v.tool.category.slug}/${v.tool.slug}` })
  const urls = [...byUrl.keys()]
  const found = new Map<string, { name: string; pages: VideoRef[] }>()
  let failed = 0
  for (let i = 0; i < urls.length; i += 8) {
    await Promise.all(urls.slice(i, i + 8).map(async (u) => {
      try {
        const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`, { signal: AbortSignal.timeout(8000) })
        if (!r.ok) { failed++; return }
        const o = await r.json()
        if (!o.author_url || !o.author_name) { failed++; return }
        const key = String(o.author_url).replace(/\/+$/, '')
        const cur = found.get(key) ?? { name: String(o.author_name), pages: [] }
        const ref = byUrl.get(u)!
        if (!cur.pages.some((p) => p.url === ref.url)) cur.pages.push(ref)
        found.set(key, cur)
      } catch { failed++ }
    }))
  }
  let added = 0
  for (const [channelUrl, c] of found) {
    const ex = await db.creator.findUnique({ where: { channelUrl } })
    if (!ex) { await db.creator.create({ data: { channelUrl, name: c.name, pages: c.pages } }); added++ }
    else await db.creator.update({ where: { channelUrl }, data: { pages: c.pages } })
  }
  return { channels: found.size, added, failed }
}

export async function getTemplate() {
  const [s, b, r] = await Promise.all(['subject', 'body', 'replyto'].map((k) => db.jobRun.findUnique({ where: { key: `creators-template:${k}` } })))
  return { subject: s?.note ?? DEFAULT_SUBJECT, body: b?.note ?? DEFAULT_BODY, replyTo: r?.note ?? '' }
}

export function renderInvite(body: string, name: string, pages: VideoRef[]) {
  const tools = [...new Set(pages.map((p) => p.toolTitle))].join(', ') || 'a tool'
  const links = [...new Set(pages.map((p) => p.url))].join('\n')
  return body
    .replaceAll('{name}', name).replaceAll('{tools}', tools).replaceAll('{pages}', links || siteUrl())
    .replaceAll('{affiliate}', `${siteUrl()}/affiliate`)
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const linkify = (t: string) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')

export async function sendInvite(to: string, subject: string, text: string, replyTo: string): Promise<boolean> {
  const html = emailShell(text.split(/\n{2,}/).map((p) => `<p>${linkify(p).replace(/\n/g, '<br>')}</p>`).join(''))
  return sendEmail({ to, subject, html, replyTo })
}
