/**
 * Importa un progetto da un indirizzo web: legge la pagina, prepara una scheda (anteprima) con l'IA,
 * e solo dopo la conferma dell'admin la crea nella categoria scelta. Le anteprime restano nel registro (JobRun).
 */
import { randomBytes } from 'node:crypto'
import { db } from './db'
import { SECTIONS } from './sections'
import { slugify } from './v1'
import { mirrorImage } from './media'

const MODEL = () => process.env.AI_MODEL_ARTICLE ?? 'claude-sonnet-5-5'
const PREFIX = 'import-project:'

export type Preview = {
  status: 'pending' | 'done'
  url: string
  title: string
  categoryId: string
  description: string
  fullDescription: string
  whatIs: string
  howItWorks: string
  whenToUse: string
  tip: string
  website: string
  logoUrl: string
  coverUrl: string
  attributes: Record<string, string>
  toolPath?: string
}

function assertPublicUrl(raw: string): URL {
  let u: URL
  try { u = new URL(raw.trim()) } catch { throw new Error('Indirizzo non valido') }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Serve un indirizzo che inizia con http o https')
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[)/.test(u.hostname) || !u.hostname.includes('.')) throw new Error('Indirizzo non consentito')
  return u
}

const meta = (html: string, key: string) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  return tag?.match(/content=["']([^"']*)["']/i)?.[1]?.trim() ?? ''
}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')

async function readPage(u: URL) {
  const res = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; CryptodroplyBot/1.0)', accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) }).catch(() => null)
  if (!res || !res.ok) return { title: '', description: '', image: '', icon: '', text: '', final: u }
  const final = new URL(res.url)
  const html = (await res.text()).slice(0, 600000)
  const abs = (v: string) => { try { return v ? new URL(decode(v), final).toString() : '' } catch { return '' } }
  const icon = html.match(/<link[^>]+rel=["'][^"']*(?:apple-touch-icon|icon)[^"']*["'][^>]*>/i)?.[0]?.match(/href=["']([^"']*)["']/i)?.[1] ?? ''
  const text = decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim().slice(0, 14000)
  return {
    title: decode(meta(html, 'og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim(),
    description: decode(meta(html, 'og:description') || meta(html, 'description')),
    image: abs(meta(html, 'og:image') || meta(html, 'twitter:image')),
    icon: abs(icon),
    text,
    final,
  }
}

async function ask(system: string, prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY mancante')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL(), max_tokens: 6000, system,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  const j = await res.json()
  return (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
}

const tag = (s: string, name: string) => s.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i'))?.[1]?.trim() ?? ''

/** Le categorie con i loro campi (per la scelta della sezione e dei dati della scheda). */
export async function categoriesBySection() {
  const cats = await db.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { translations: { where: { locale: 'EN' } }, attributes: { orderBy: { sortOrder: 'asc' } } } })
  return SECTIONS.map((s) => ({
    section: s,
    cats: cats.filter((c) => c.wixId && s.collections.includes(c.wixId)).map((c) => ({ id: c.id, slug: c.slug, wixId: c.wixId!, name: c.translations[0]?.name ?? c.slug, attributes: c.attributes })),
  }))
}

export async function analyzeProject(rawUrl: string, notes = ''): Promise<string> {
  const u = assertPublicUrl(rawUrl)
  const page = await readPage(u)
  const groups = await categoriesBySection()
  const catList = groups
    .map((g) => `Section "${g.section.title}":\n` + g.cats.map((c) => `  - ${c.wixId} (${c.name}); fields: ${c.attributes.map((a) => `${a.key}="${a.labelEn}"`).join(', ') || 'none'}`).join('\n'))
    .join('\n')
  const out = await ask(
    `You prepare tool listings for Cryptodroply, a crypto tools directory, in clear plain English for beginners and intermediate users. Short sentences, no hype, no price predictions, no financial advice, no promises of results, no long dashes. Use only facts found on the page or in web searches, never invent numbers, fees or features. Tone is educational and neutral: never suggest avoiding laws, taxes, identity checks or authorities; if the project deals with privacy, describe how it protects personal data and remind that users must follow the laws of their country.`,
    `Prepare a listing for this project: ${u.toString()}
Page title: ${page.title}
Page description: ${page.description}
Page text (may be partial): ${page.text}
${notes.trim() ? `\nEditor's notes for this listing (follow them for content, angle, emphasis, category and details; the tone and safety rules above always stay in force; facts that are not on the page or in the notes must not be invented):\n${notes.trim().slice(0, 3000)}\n` : ''}
Choose the single best category from this list (answer with the id in brackets only):
${catList}

Then fill the fields of that category (only the keys listed for it). Use short values: Yes or No for yes/no features, otherwise a short word or phrase. Leave out a key if you do not know it.
HTML format for the long fields: <p> paragraphs, <ul><li> and <ol><li> lists, <strong> for emphasis, nothing else.
Answer ONLY in this format:
<title>project name</title>
<category>category id</category>
<description>one sentence, under 120 characters, what it is</description>
<fullDescription>2 to 3 sentences, plain text</fullDescription>
<whatIs>html: what it is and who it is for, 2 paragraphs</whatIs>
<howItWorks>html: numbered list of 4 to 6 steps</howItWorks>
<whenToUse>html: "Use it when" list of 3 to 4 items, and "Not ideal if" list of 2 to 3 items</whenToUse>
<tip>two short words or phrases separated by a line break</tip>
<attrs>{"key":"value"}</attrs>`,
  )
  const title = tag(out, 'title')
  const wix = tag(out, 'category').replace(/[^\w]/g, '')
  const cat = groups.flatMap((g) => g.cats).find((c) => c.wixId === wix)
  if (!title || !cat) throw new Error('L’IA non ha restituito una scheda utilizzabile, riprova')
  let attributes: Record<string, string> = {}
  try {
    const raw = JSON.parse(tag(out, 'attrs') || '{}') as Record<string, unknown>
    for (const a of cat.attributes) if (raw[a.key] != null && String(raw[a.key]).trim()) attributes[a.key] = String(raw[a.key]).trim()
  } catch { attributes = {} }
  const preview: Preview = {
    status: 'pending', url: page.final.toString(), title: title.slice(0, 80), categoryId: cat.id,
    description: tag(out, 'description'), fullDescription: tag(out, 'fullDescription'), whatIs: tag(out, 'whatIs'),
    howItWorks: tag(out, 'howItWorks'), whenToUse: tag(out, 'whenToUse'), tip: tag(out, 'tip'),
    website: page.final.origin + '/', logoUrl: page.icon || `https://www.google.com/s2/favicons?domain=${page.final.hostname}&sz=256`,
    coverUrl: page.image, attributes,
  }
  const id = randomBytes(6).toString('hex')
  await db.jobRun.create({ data: { key: PREFIX + id, note: JSON.stringify(preview) } })
  return id
}

export async function pendingPreviews(): Promise<{ id: string; p: Preview }[]> {
  const rows = await db.jobRun.findMany({ where: { key: { startsWith: PREFIX } }, orderBy: { ranAt: 'desc' }, take: 20 })
  const out: { id: string; p: Preview }[] = []
  for (const r of rows) {
    try { const p = JSON.parse(r.note ?? '') as Preview; if (p.status === 'pending') out.push({ id: r.key.slice(PREFIX.length), p }) } catch {}
  }
  return out
}

export async function discardPreview(id: string) {
  await db.jobRun.deleteMany({ where: { key: PREFIX + id } })
}

/** Crea la scheda nella categoria scelta (con i dati eventualmente corretti dall'admin). */
export async function acceptPreview(id: string, f: Omit<Preview, 'status' | 'url'> & { publish: boolean }): Promise<string> {
  const row = await db.jobRun.findUnique({ where: { key: PREFIX + id } })
  if (!row) throw new Error('Anteprima non trovata')
  const prev = JSON.parse(row.note ?? '{}') as Preview
  if (prev.status === 'done') throw new Error('Già caricata')
  const category = await db.category.findUnique({ where: { id: f.categoryId } })
  if (!category) throw new Error('Scegli la categoria')
  if (!f.title.trim()) throw new Error('Manca il nome')
  let slug = slugify(f.title)
  for (let i = 2; await db.tool.findUnique({ where: { categoryId_slug: { categoryId: category.id, slug } } }); i++) slug = `${slugify(f.title)}-${i}`
  let wixId = `custom:${slug}`
  for (let i = 2; await db.tool.findUnique({ where: { wixId } }); i++) wixId = `custom:${slug}-${i}`
  const last = await db.tool.findFirst({ where: { categoryId: category.id }, orderBy: { sortOrder: 'desc' } })
  const img = async (u: string) => (/^https?:\/\//i.test(u.trim()) ? mirrorImage(u.trim()) : u.trim().startsWith('/media/') ? u.trim() : null)
  const tool = await db.tool.create({
    data: {
      wixId, categoryId: category.id, slug, title: f.title.trim(),
      logoUrl: await img(f.logoUrl), coverUrl: await img(f.coverUrl), websiteUrl: f.website.trim() || null,
      attributes: f.attributes, sortOrder: (last?.sortOrder ?? 0) + 1,
      status: f.publish ? 'PUBLISHED' : 'DRAFT', publishedAt: f.publish ? new Date() : null,
      translations: { create: { locale: 'EN', description: f.description, fullDescription: f.fullDescription, whatIs: f.whatIs, howItWorks: f.howItWorks, whenToUse: f.whenToUse, tip: f.tip } },
    },
  })
  const path = `/${category.slug}/${tool.slug}`
  await db.jobRun.update({ where: { key: PREFIX + id }, data: { note: JSON.stringify({ ...prev, status: 'done', toolPath: path }) } })
  // traduzione italiana in secondo piano
  void import('./translate').then((m) => m.translateMissing((x) => console.log('[translate] ' + x), 5)).catch(() => undefined)
  return path
}
