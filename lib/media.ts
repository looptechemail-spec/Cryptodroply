import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { db } from './db'

const WIX_MEDIA = 'https://static.wixstatic.com/media/'

/** Indirizzo pubblico di un'immagine Wix a partire dal suo id (b69407_xxx~mv2.png). */
export const wixImageUrl = (id: string) => (id.startsWith('http') ? id : WIX_MEDIA + id)

/**
 * Copia un'immagine del vecchio sito nel database e restituisce l'indirizzo locale (/media/<id>).
 * Così le immagini restano anche quando Wix viene chiuso. Si può ripetere: la stessa immagine non si scarica due volte.
 * Se il download fallisce restituisce l'indirizzo originale.
 */
export async function mirrorImage(sourceUrl: string): Promise<string> {
  const id = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 24)
  const local = `/media/${id}`
  if (await db.media.findUnique({ where: { id }, select: { id: true } })) return local
  try {
    const res = await fetch(sourceUrl)
    if (!res.ok) return sourceUrl
    const data = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'image/png'
    await db.media.upsert({ where: { id }, update: {}, create: { id, sourceUrl, contentType, data } })
    return local
  } catch {
    return sourceUrl
  }
}

/** L'indirizzo locale che mirrorImage darebbe a questo indirizzo sorgente (per riconoscere immagini già copiate). */
export const mediaIdFor = (sourceUrl: string) => '/media/' + createHash('sha1').update(sourceUrl).digest('hex').slice(0, 24)

/** Copia un'immagine del repository (es. data/logos/x.jpg) nel database e restituisce l'indirizzo locale (/media/<id>). */
export async function mirrorLocalFile(relPath: string, contentType: string): Promise<string | null> {
  const key = 'file:' + relPath
  const id = createHash('sha1').update(key).digest('hex').slice(0, 24)
  try {
    const data = await readFile(path.join(process.cwd(), relPath))
    await db.media.upsert({ where: { id }, update: { data, contentType }, create: { id, sourceUrl: key, contentType, data } })
    return `/media/${id}`
  } catch {
    return null
  }
}

/** Copia sul sito i loghi e le copertine degli strumenti che puntano ancora a siti esterni (con il blocco anti-copia dei siti i loghi sparivano). */
export async function mirrorExternalToolImages(log: (m: string) => void = () => {}): Promise<number> {
  const tools = await db.tool.findMany({
    where: { OR: [{ logoUrl: { startsWith: 'http' } }, { coverUrl: { startsWith: 'http' } }] },
    select: { id: true, slug: true, logoUrl: true, coverUrl: true },
  })
  let n = 0
  for (const t of tools) {
    const data: { logoUrl?: string; coverUrl?: string } = {}
    if (t.logoUrl?.startsWith('http')) { const m = await mirrorImage(t.logoUrl); if (m.startsWith('/media/')) data.logoUrl = m }
    if (t.coverUrl?.startsWith('http')) { const m = await mirrorImage(t.coverUrl); if (m.startsWith('/media/')) data.coverUrl = m }
    if (Object.keys(data).length) { await db.tool.update({ where: { id: t.id }, data }); n++; log(`immagini copiate: ${t.slug}`) }
  }
  return n
}
