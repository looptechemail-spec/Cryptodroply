/** Operazioni di lancio, sicure da ripetere: copia delle immagini Wix sul sito e pulizia delle bozze SEO. */
import { db } from './db'
import { mirrorImage } from './media'

const WIX_RE = /https:\/\/static\.wixstatic\.com\/[^\s"'()\]<>\\]+/g
const isWix = (s?: string | null) => !!s && s.includes('static.wixstatic.com')

async function swapUrls(text: string, cache: Map<string, string>): Promise<string> {
  let out = text
  for (const url of new Set(text.match(WIX_RE) ?? [])) {
    let local = cache.get(url)
    if (!local) { local = await mirrorImage(url); cache.set(url, local) }
    if (local !== url) out = out.split(url).join(local)
  }
  return out
}

/** Copia nel database tutte le immagini che ancora puntano a Wix (loghi, copertine, testi) e aggiorna gli indirizzi. */
export async function mirrorWixImages(log: (m: string) => void = () => {}): Promise<number> {
  const cache = new Map<string, string>()
  let changed = 0
  const tools = await db.tool.findMany({
    where: { OR: [{ logoUrl: { contains: 'static.wixstatic.com' } }, { coverUrl: { contains: 'static.wixstatic.com' } }] },
    select: { id: true, logoUrl: true, coverUrl: true },
  })
  for (const t of tools) {
    const data: { logoUrl?: string; coverUrl?: string } = {}
    if (isWix(t.logoUrl)) data.logoUrl = await swapUrls(t.logoUrl!, cache)
    if (isWix(t.coverUrl)) data.coverUrl = await swapUrls(t.coverUrl!, cache)
    await db.tool.update({ where: { id: t.id }, data }); changed++
  }
  const posts = await db.post.findMany({ where: { coverUrl: { contains: 'static.wixstatic.com' } }, select: { id: true, coverUrl: true } })
  for (const p of posts) { await db.post.update({ where: { id: p.id }, data: { coverUrl: await swapUrls(p.coverUrl!, cache) } }); changed++ }

  const FIELDS = ['description', 'fullDescription', 'whatIs', 'howItWorks', 'whenToUse', 'tip'] as const
  const trs = await db.toolTranslation.findMany({ where: { OR: FIELDS.map((f) => ({ [f]: { contains: 'static.wixstatic.com' } })) } })
  for (const tr of trs) {
    const data: Record<string, string> = {}
    for (const f of FIELDS) { const v = tr[f]; if (isWix(v)) data[f] = await swapUrls(v!, cache) }
    await db.toolTranslation.update({ where: { id: tr.id }, data }); changed++
  }
  const pts = await db.postTranslation.findMany({ where: { contentMd: { contains: 'static.wixstatic.com' } }, select: { id: true, contentMd: true } })
  for (const pt of pts) { await db.postTranslation.update({ where: { id: pt.id }, data: { contentMd: await swapUrls(pt.contentMd, cache) } }); changed++ }
  if (changed) log(`Immagini Wix copiate sul sito: ${changed} record aggiornati, ${cache.size} immagini`)
  return changed
}

/** Quante cose puntano ancora a Wix (per il controllo di lancio). */
export async function wixImageLeft(): Promise<number> {
  const [a, b, c, d] = await Promise.all([
    db.tool.count({ where: { OR: [{ logoUrl: { contains: 'static.wixstatic.com' } }, { coverUrl: { contains: 'static.wixstatic.com' } }] } }),
    db.post.count({ where: { coverUrl: { contains: 'static.wixstatic.com' } } }),
    db.toolTranslation.count({ where: { OR: ['fullDescription', 'whatIs', 'howItWorks', 'whenToUse', 'tip', 'description'].map((f) => ({ [f]: { contains: 'static.wixstatic.com' } })) } }),
    db.postTranslation.count({ where: { contentMd: { contains: 'static.wixstatic.com' } } }),
  ])
  return a + b + c + d
}

/** Una sola volta: toglie le bozze SEO generate in automatico. Quelle pubblicate non si toccano. */
export async function clearSeoDraftsOnce(log: (m: string) => void = () => {}) {
  const key = 'seo-drafts-cleared-1'
  try { await db.jobRun.create({ data: { key } }) } catch { return }
  const r = await db.seoPage.deleteMany({ where: { status: { not: 'PUBLISHED' } } })
  await db.jobRun.update({ where: { key }, data: { note: `${r.count} bozze tolte` } })
  log(`Bozze SEO tolte: ${r.count}`)
}
