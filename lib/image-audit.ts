/** Controllo delle immagini di anteprima: per ogni strumento scrive nei log il logo (dimensioni, peso, impronta). Non modifica nulla. */
import { createHash } from 'node:crypto'
import { db } from './db'

function size(b: Buffer): string {
  try {
    if (b[0] === 0x89 && b[1] === 0x50) return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue }
        const m = b[i + 1]
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`
        i += 2 + b.readUInt16BE(i + 2)
      }
    }
  } catch { /* formato non letto */ }
  return '?'
}

export async function auditToolImages(log: (m: string) => void = () => {}) {
  const tools = await db.tool.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, logoUrl: true, coverUrl: true, category: { select: { slug: true } } }, orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }] })
  for (const t of tools) {
    const u = t.logoUrl ?? t.coverUrl
    if (!u) { log(`${t.category.slug}/${t.slug}: SENZA IMMAGINE`); continue }
    if (!u.startsWith('/media/')) { log(`${t.category.slug}/${t.slug}: immagine esterna ${u.slice(0, 60)}`); continue }
    const m = await db.media.findUnique({ where: { id: u.slice(7) }, select: { data: true, contentType: true } })
    if (!m) { log(`${t.category.slug}/${t.slug}: IMMAGINE MANCANTE ${u}`); continue }
    log(`${t.category.slug}/${t.slug}: ${size(Buffer.from(m.data))} ${m.data.length}B ${m.contentType} sha=${createHash('sha1').update(m.data).digest('hex').slice(0, 8)}`)
  }
}
