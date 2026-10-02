/** Articoli del blog: copertina, pubblicazione subito o programmata. */
import { randomBytes } from 'node:crypto'
import { db } from './db'
import { mirrorImage } from './media'
import { articleSocial } from './ai-content'

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

/** Salva la copertina (file caricato o indirizzo web) e la collega all'articolo. Senza nuovi dati lascia quella che c'è. */
export async function saveCover(postId: string, file: File | null, url: string): Promise<string | null> {
  let cover: string | null = null
  if (file && file.size > 0) {
    if (!TYPES[file.type]) throw new Error('La copertina deve essere PNG, JPG, WEBP o GIF')
    if (file.size > 6 * 1024 * 1024) throw new Error('La copertina supera 6 MB')
    const id = randomBytes(12).toString('hex')
    await db.media.create({ data: { id, sourceUrl: `upload:article:${postId}`, contentType: file.type, data: Buffer.from(await file.arrayBuffer()) } })
    cover = `/media/${id}`
  } else if (/^https?:\/\//i.test(url.trim())) {
    cover = await mirrorImage(url.trim())
  } else if (url.trim().startsWith('/media/')) {
    cover = url.trim()
  }
  if (cover) await db.post.update({ where: { id: postId }, data: { coverUrl: cover } })
  return cover
}

async function ready(postId: string) {
  const post = await db.post.findUnique({ where: { id: postId }, include: { translations: true } })
  if (!post) throw new Error('Articolo non trovato')
  if (!post.coverUrl) throw new Error('Serve l’immagine di copertina: caricala o incolla un indirizzo, poi riprova')
  if (!post.translations.some((t) => t.locale === 'EN' && t.title && t.contentMd)) throw new Error('Articolo senza titolo o testo')
  return post
}

/** Pubblica subito. Con `social` crea anche i 3 post su Publer (tra 15 minuti). */
export async function publishNow(postId: string, social: boolean): Promise<string> {
  await ready(postId)
  await db.post.update({ where: { id: postId }, data: { status: 'PUBLISHED', publishedAt: new Date(), scheduledAt: null } })
  if (!social) return 'Articolo pubblicato'
  return 'Articolo pubblicato. ' + (await articleSocial(postId, new Date(Date.now() + 15 * 60000)))
}

/** Programma l'uscita a un'ora precisa (l'articolo resta bozza e viene pubblicato da solo). Con `social` i post Publer escono alla stessa ora. */
export async function scheduleArticle(postId: string, when: Date, social: boolean): Promise<string> {
  await ready(postId)
  if (when.getTime() < Date.now() + 2 * 60000) throw new Error('Scegli una data e un’ora nel futuro')
  await db.post.update({ where: { id: postId }, data: { scheduledAt: when } })
  if (!social) return `Articolo programmato per ${when.toISOString()}`
  return `Articolo programmato per ${when.toISOString()}. ` + (await articleSocial(postId, when))
}

export async function unscheduleArticle(postId: string) {
  await db.post.update({ where: { id: postId }, data: { scheduledAt: null } })
}

/** Ogni minuto: pubblica gli articoli programmati la cui ora è arrivata. */
export async function publishDueArticles(log: (m: string) => void = () => {}): Promise<number> {
  const due = await db.post.findMany({ where: { status: 'DRAFT', scheduledAt: { lte: new Date() } }, select: { id: true, slug: true, scheduledAt: true, coverUrl: true } })
  let n = 0
  for (const p of due) {
    if (!p.coverUrl) { log(`articolo ${p.slug}: senza copertina, non pubblicato`); await db.post.update({ where: { id: p.id }, data: { scheduledAt: null } }); continue }
    await db.post.update({ where: { id: p.id }, data: { status: 'PUBLISHED', publishedAt: p.scheduledAt ?? new Date(), scheduledAt: null } })
    log(`articolo pubblicato: ${p.slug}`)
    n++
  }
  return n
}
