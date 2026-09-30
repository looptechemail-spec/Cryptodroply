/**
 * Import da file CSV esportati da Wix (cartella data/csv). Serve per le collezioni che l'API non
 * restituisce per intero. Usa gli stessi id dell'import API (categoria:ID), quindi non crea duplicati.
 */
import fs from 'node:fs'
import path from 'node:path'
import { Access, PublishStatus } from '@prisma/client'
import { db } from './db'

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cur); cur = ''
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
    } else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some((x) => x !== '')) rows.push(row) }
  return rows
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const plain = (v: string | null) => v ? v.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim() || null : null
const img = (v: string | null) => {
  if (!v) return null
  const m = v.match(/^wix:image:\/\/v1\/([^/#]+)/)
  return m ? `https://static.wixstatic.com/media/${m[1]}` : v.startsWith('http') ? v : null
}
const isYoutube = (v: string) => /(youtu\.be\/|youtube\.com\/)/.test(v)
const num = (k: string) => parseInt(k.match(/\d+/)?.[0] ?? '1', 10)

const DESC = ['description'], LOGO = ['logo', 'image'], REF = ['reflink', 'ref link'], COVER = ['img articolo']
const WHAT = ["cos'è", 'what is it'], HOW = ['come funziona', 'how it works'], WHEN = ['quando usarlo', 'when to use it']
const SKIP = new Set(['title', 'id', 'created date', 'updated date', 'owner', 'star rate', 'full description', 'tip', 'manual sort',
  'publish date', 'unpublish date', 'status', 'ordine', ...DESC, ...LOGO, ...REF, ...COVER, ...WHAT, ...HOW, ...WHEN])

export async function importCsvFiles(log: (m: string) => void) {
  const dir = path.join(process.cwd(), 'data', 'csv')
  if (!fs.existsSync(dir)) return
  let total = 0
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.csv')).sort()) {
    const rows = parseCsv(fs.readFileSync(path.join(dir, file), 'utf8').replace(/^﻿/, ''))
    const head = rows.shift() ?? []
    // colonna "<Categoria> (Item)" = percorso pubblico (/faucet/nome), colonna "PRO ... (Item)" = versione PRO
    const linkIdx = head.findIndex((h) => /\(Item\)/.test(h) && !/^PRO /.test(h))
    const proIdx = head.findIndex((h) => /^PRO .*\(Item\)/.test(h))
    const first = rows.find((r) => r[linkIdx])
    const base = first?.[linkIdx]?.split('/')[1]
    const category = base ? await db.category.findFirst({ where: { slug: base }, include: { attributes: true } }) : null
    if (!category) { log(`${file}: categoria "${base}" non trovata, salto`); continue }
    const wixCol = category.wixId ?? category.slug
    const low = head.map((h) => h.toLowerCase().trim())
    let n = 0
    for (const r of rows) {
      const get = (...names: string[]) => { for (const nm of names) { const i = low.indexOf(nm); if (i >= 0 && r[i]?.trim()) return r[i] } return null }
      const title = plain(get('title'))
      if (!title) continue
      const slug = slugify(title)
      const attributes: Record<string, string> = {}
      head.forEach((h, i) => {
        const v = r[i]?.trim()
        if (!v || v.startsWith('wix:') || SKIP.has(h.toLowerCase().trim()) || /^(video|titol|created|creator|link-)/i.test(h) || /\(Item\)/.test(h)) return
        const def = category.attributes.find((a) => a.labelEn === h) ?? category.attributes.find((a) => a.labelEn.toLowerCase() === h.toLowerCase())
        if (def) attributes[def.key] = v
      })
      const link = r[linkIdx] || `/${base}/${slug}`
      const data = {
        categoryId: category.id, slug, title,
        legacyPath: link,
        legacyProPath: proIdx >= 0 && r[proIdx] ? r[proIdx] : null,
        logoUrl: img(get(...LOGO)), coverUrl: img(get(...COVER)),
        refLink: get(...REF), attributes,
        sortOrder: parseInt(get('manual sort') ?? '', 10) || n,
        status: (get('status') === 'DRAFT' ? 'DRAFT' : 'PUBLISHED') as PublishStatus,
        publishedAt: new Date(get('created date') ?? Date.now()),
      }
      const wixId = `${wixCol}:${get('id') ?? slug}`
      const tool = await db.tool.upsert({ where: { wixId }, update: data, create: { ...data, wixId } })
      const tr = {
        description: plain(get(...DESC)), fullDescription: get('full description'),
        whatIs: get(...WHAT), howItWorks: get(...HOW), whenToUse: get(...WHEN), tip: get('tip'),
      }
      await db.toolTranslation.upsert({
        where: { toolId_locale: { toolId: tool.id, locale: 'EN' } },
        update: tr, create: { toolId: tool.id, locale: 'EN', ...tr },
      })
      const urlCols = head.map((h, i) => ({ h, i })).filter(({ h, i }) => /^video/i.test(h) && r[i] && isYoutube(r[i])).sort((a, b) => num(a.h) - num(b.h))
      if (urlCols.length) {
        await db.toolVideo.deleteMany({ where: { toolId: tool.id } })
        for (const [k, { i }] of urlCols.entries()) {
          const t = head.findIndex((h) => /^titol/i.test(h) && num(h) === num(head[i]))
          const d = head.findIndex((h) => /^(created|creator)\d*$/i.test(h) && num(h) === num(head[i]))
          await db.toolVideo.create({ data: {
            toolId: tool.id, youtubeUrl: r[i].trim(), sortOrder: k,
            titleEn: t >= 0 ? r[t]?.trim() || null : null, description: d >= 0 ? plain(r[d]) : null, access: Access.PRO,
          } })
        }
      }
      n++; total++
    }
    log(`${file}: ${n} tool (categoria ${category.slug})`)
  }
  log(`Tool da CSV: ${total}`)
}
