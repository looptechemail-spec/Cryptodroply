/**
 * Sistemazioni del catalogo, sicure da ripetere: si applicano all'avvio del sito e dopo ogni import.
 * - le categorie in MERGED_INTO (Testnet) vengono assorbite dalla categoria di destinazione (Airdrop);
 * - i nomi in CATEGORY_NAMES sostituiscono i nomi italiani arrivati da Wix.
 */
import { db } from './db'
import { CATEGORY_NAMES, MERGED_INTO } from './sections'

export async function applyCatalogTweaks(log: (m: string) => void = () => {}) {
  for (const [wixId, name] of Object.entries(CATEGORY_NAMES)) {
    const cat = await db.category.findUnique({ where: { wixId } })
    if (!cat) continue
    await db.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: cat.id, locale: 'EN' } },
      update: { name }, create: { categoryId: cat.id, locale: 'EN', name },
    })
  }

  for (const [fromId, toId] of Object.entries(MERGED_INTO)) {
    const from = await db.category.findUnique({ where: { wixId: fromId }, include: { attributes: true } })
    const to = await db.category.findUnique({ where: { wixId: toId } })
    if (!from || !to) continue
    // i campi (attributi) della categoria assorbita si aggiungono a quella di destinazione, senza toccare quelli esistenti
    for (const a of from.attributes) {
      await db.attributeDef.upsert({
        where: { categoryId_key: { categoryId: to.id, key: a.key } },
        update: {}, create: { categoryId: to.id, key: a.key, labelEn: a.labelEn, sortOrder: 100 + a.sortOrder },
      })
    }
    const tools = await db.tool.findMany({ where: { categoryId: from.id } })
    for (const t of tools) {
      const clash = await db.tool.findUnique({ where: { categoryId_slug: { categoryId: to.id, slug: t.slug } } })
      await db.tool.update({ where: { id: t.id }, data: { categoryId: to.id, slug: clash ? `${t.slug}-testnet` : t.slug } })
    }
    // i vecchi indirizzi della categoria portano a quella nuova
    for (const [a, b] of [[`/${from.slug}`, `/${to.slug}`], [`/pro-${from.slug}`, `/${to.slug}`]]) {
      await db.redirect.upsert({ where: { fromPath: a }, update: { toPath: b }, create: { fromPath: a, toPath: b } })
    }
    await db.category.delete({ where: { id: from.id } })
    log(`Categoria ${fromId} unita in ${toId}: ${tools.length} tool spostati`)
  }

  // le analisi delle monete (categoria "Weekly Crypto analysis") sono sempre riservate ai paganti
  const r = await db.post.updateMany({ where: { category: { slug: 'weekly-crypto-analysis' }, NOT: { access: 'PRO' } }, data: { access: 'PRO' } })
  if (r.count) log(`Analisi rese PRO: ${r.count}`)
}
