import { createHash } from 'node:crypto'
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
