/**
 * Sistemazioni del catalogo, sicure da ripetere: si applicano all'avvio del sito e dopo ogni import.
 * - le categorie in MERGED_INTO (Testnet) vengono assorbite dalla categoria di destinazione (Airdrop);
 * - i nomi in CATEGORY_NAMES sostituiscono i nomi italiani arrivati da Wix.
 */
import { db } from './db'
import { CATEGORY_NAMES, MERGED_INTO } from './sections'
import { applyExtraTools } from './extra-tools'

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
  await applyExtraTools(log)
  await applyEditorRequests(log)
}

/** Richieste dell'editore: tolgono LitVM Testnet (una volta sola) e mettono AirdropAlert e Airdrops.io in cima agli airdrop. */
async function applyEditorRequests(log: (m: string) => void) {
  const has = (v: string | null | undefined, ...w: string[]) => { const x = (v ?? '').toLowerCase(); return w.every((k) => x.includes(k)) }

  // 1) elimina LitVM Testnet da strumenti e articoli (una volta sola)
  const key = 'one-shot:remove-litvm-testnet'
  if (!(await db.jobRun.findUnique({ where: { key } }))) {
    const tools = await db.tool.findMany()
    const hitT = tools.filter((t) => has(t.title, 'litvm', 'testnet') || has(t.slug, 'litvm', 'testnet'))
    const posts = await db.post.findMany({ include: { translations: true } })
    const hitP = posts.filter((p) => has(p.slug, 'litvm', 'testnet') || p.translations.some((x) => has(x.title, 'litvm', 'testnet')))
    for (const t of hitT) { await db.tool.delete({ where: { id: t.id } }); log(`LitVM: eliminato strumento "${t.title}" (${t.slug}, ${t.status})`) }
    for (const p of hitP) { await db.post.delete({ where: { id: p.id } }); log(`LitVM: eliminato articolo "${p.translations[0]?.title ?? p.slug}" (${p.slug}, ${p.status})`) }
    if (!hitT.length && !hitP.length) {
      const near = [...tools.filter((t) => has(t.title, 'litvm') || has(t.slug, 'litvm')).map((t) => `strumento ${t.slug}`), ...posts.filter((p) => has(p.slug, 'litvm') || p.translations.some((x) => has(x.title, 'litvm'))).map((p) => `articolo ${p.slug}`)]
      log(`LitVM: nessuna corrispondenza con "litvm testnet". Simili: ${near.join(', ') || 'nessuno'}`)
    }
    await db.jobRun.create({ data: { key, note: `eliminati ${hitT.length} strumenti e ${hitP.length} articoli` } })
  }

  // 1a) SBRC-20 tolto dagli airdrop (a ogni avvio, così non torna con un nuovo import)
  const sb = (await db.tool.findMany()).filter((t) => has(t.title, 'sbrc') || has(t.slug, 'sbrc'))
  for (const t of sb) { await db.tool.delete({ where: { id: t.id } }); log(`SBRC-20: eliminato strumento "${t.title}" (${t.slug})`) }

  // 1b) WEMIX Play: sito ufficiale https://wemixplay.com/ (il link di affiliazione, se c'è, non si tocca)
  const wm = await db.tool.findMany({ where: { OR: [{ title: { contains: 'wemix', mode: 'insensitive' } }, { slug: { contains: 'wemix', mode: 'insensitive' } }] } })
  for (const t of wm) {
    log(`WEMIX: "${t.title}" (${t.slug}) sito=${t.websiteUrl ?? '-'} affiliazione=${t.refLink ?? '-'}`)
    if (has(t.title, 'play') || has(t.slug, 'play')) {
      // il campo affiliazione conteneva un video YouTube: il pulsante del sito portava al video, quindi si svuota
      if (t.refLink && /youtube\.com|youtu\.be/i.test(t.refLink)) { await db.tool.update({ where: { id: t.id }, data: { refLink: null } }); log(`WEMIX Play: tolto il link sbagliato nel campo affiliazione (${t.refLink})`) }
      if (t.websiteUrl !== 'https://wemixplay.com/') { await db.tool.update({ where: { id: t.id }, data: { websiteUrl: 'https://wemixplay.com/' } }); log(`WEMIX Play: sito aggiornato a https://wemixplay.com/ (era ${t.websiteUrl ?? 'vuoto'})`) }
    }
  }

  // 2) airdrop: AirdropAlert e Airdrops.io per primi (valori fissi, si può ripetere)
  const cat = await db.category.findUnique({ where: { wixId: 'Import7' } })
  if (cat) {
    const list = await db.tool.findMany({ where: { categoryId: cat.id } })
    const find = (...w: string[]) => list.find((t) => w.some((k) => has(t.title, k) || has(t.slug, k.replace(/\./g, '-')) || has(t.slug, k.replace(/\./g, '')) || has(t.websiteUrl, k)))
    const a = find('airdropalert'), b = find('airdrops.io')
    if (a) await db.tool.update({ where: { id: a.id }, data: { sortOrder: -100 } })
    if (b) await db.tool.update({ where: { id: b.id }, data: { sortOrder: -99 } })
    log(`Airdrop in cima: ${a ? a.title : 'AirdropAlert NON trovato'}, ${b ? b.title : 'Airdrops.io NON trovato'}`)
  }

  // 3) gaming: PlayToEarn per primo, poi Decentraland, poi gli altri
  const gcat = await db.category.findUnique({ where: { wixId: 'Gaming' } })
  if (gcat) {
    const list = await db.tool.findMany({ where: { categoryId: gcat.id } })
    const fnd = (...w: string[]) => list.find((t) => w.some((k) => has(t.title, k) || has(t.slug, k.replace(/[^a-z0-9]/g, '')) || has(t.slug, k.replace(/[^a-z0-9]/g, '-')) || has(t.websiteUrl, k.replace(/ /g, ''))))
    const p = fnd('play to earn', 'playtoearn', 'play-to-earn'), d = fnd('decentraland')
    if (p) await db.tool.update({ where: { id: p.id }, data: { sortOrder: -100 } })
    if (d) await db.tool.update({ where: { id: d.id }, data: { sortOrder: -99 } })
    log(`Gaming in cima: ${p ? p.title : 'PlayToEarn NON trovato'}, ${d ? d.title : 'Decentraland NON trovato'}`)
  }
}
