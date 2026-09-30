/**
 * Import dei contenuti da Wix (CMS) verso il database PostgreSQL di Cryptodroply.
 *
 * Uso:
 *   WIX_API_KEY=... WIX_SITE_ID=... DATABASE_URL=... npm run import:wix
 *
 * - Sicuro da rilanciare: usa upsert sugli id Wix (nessun duplicato).
 * - Importa: 19 collezioni di tool (categorie, attributi, tool, video), categorie/tag/articoli del blog.
 * - Non importa: membri (vanno ricontattati uno a uno), ordini, moduli.
 */
import { PrismaClient, Access, PublishStatus } from '@prisma/client'

const prisma = new PrismaClient()
const API = 'https://www.wixapis.com'
const KEY = process.env.WIX_API_KEY
const SITE = process.env.WIX_SITE_ID
if (!KEY || !SITE) throw new Error('Imposta WIX_API_KEY e WIX_SITE_ID')

const TOOL_COLLECTIONS = [
  'ColdWallet', 'Wallet', 'CryptoCard', 'ExchangeCEX', 'ExchangeDEX', 'Faucet',
  'Gaming', 'Growth', 'Import1', 'Import2', 'Import4', 'Import7', 'Import8',
  'Launchpad', 'SpendingTools', 'TaskPlatform', 'toolsanalysis', 'toolssecurity', 'Trading',
]

// Campi comuni a tutte le collezioni: non diventano "attributi" della categoria.
const COMMON = new Set([
  'title_fld', 'description_fld', 'image_fld', 'fullDescription', 'imgArticolo', 'starRate',
  'cos', 'comeFunziona', 'quandoUsarlo', 'tip', 'refLink', 'reflink',
])
const isSystem = (k: string) => k.startsWith('_') || k.startsWith('link-')
const isVideoField = (k: string) => /video/i.test(k) || /^titol/i.test(k) || /^created\d*$/.test(k)

async function wix(path: string, method = 'GET', body?: unknown): Promise<any> {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: KEY!, 'wix-site-id': SITE!, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Wix ${method} ${path} -> ${res.status} ${await res.text()}`)
  return res.json()
}

async function* queryAll(collectionId: string, pageSize = 20): AsyncGenerator<any> {
  for (let offset = 0; ; offset += pageSize) {
    const r = await wix('/wix-data/v2/items/query', 'POST', {
      dataCollectionId: collectionId,
      query: { paging: { limit: pageSize, offset } },
    })
    const list: any[] = r.dataItems ?? []
    for (const it of list) yield it.data
    if (list.length < pageSize) return
  }
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// wix:image://v1/<id>/<nome>#... -> URL pubblico
function img(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null
  const m = v.match(/^wix:image:\/\/v1\/([^/#]+)/)
  if (m) return `https://static.wixstatic.com/media/${m[1]}`
  return v.startsWith('http') ? v : null
}
const date = (v: any): Date | null => {
  const s = typeof v === 'object' && v ? v.$date : v
  const d = s ? new Date(s) : null
  return d && !isNaN(d.getTime()) ? d : null
}
const num = (k: string) => parseInt(k.match(/\d+/)?.[0] ?? '1', 10)
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)

async function importTools() {
  const { collections } = await wix('/wix-data/v2/collections')
  let total = 0
  for (const [order, id] of TOOL_COLLECTIONS.entries()) {
    const col = collections.find((c: any) => c.id === id)
    if (!col) { console.warn(`Collezione ${id} non trovata, salto`); continue }

    // percorsi URL attuali: /cold-wallet/{title} e /pro-cold-wallet/{title}
    const linkOf = (pro: boolean) => col.fields.find((f: any) =>
      f.type === 'PAGE_LINK' && f.key.startsWith('link-') && f.key.includes('copy-of') === pro)
    const patternOf = (f: any) => f?.typeMetadata?.pageLink?.calculator?.fieldsPattern?.pattern as string | undefined
    const base = patternOf(linkOf(false))?.split('/')[1] ?? slugify(col.displayName)
    const proBase = patternOf(linkOf(true))?.split('/')[1] ?? null

    const category = await prisma.category.upsert({
      where: { wixId: id },
      update: { slug: base, sortOrder: order },
      create: { wixId: id, slug: base, sortOrder: order,
        translations: { create: { locale: 'EN', name: col.displayName } } },
    })

    // campi specifici della categoria -> AttributeDef (l'etichetta è il nome del campo nel CMS)
    const attrFields = col.fields.filter((f: any) =>
      f.type === 'TEXT' && !f.systemField && !COMMON.has(f.key) && !isSystem(f.key) && !isVideoField(f.key))
    for (const [i, f] of attrFields.entries()) {
      await prisma.attributeDef.upsert({
        where: { categoryId_key: { categoryId: category.id, key: f.key } },
        update: { labelEn: f.displayName, sortOrder: i },
        create: { categoryId: category.id, key: f.key, labelEn: f.displayName, sortOrder: i },
      })
    }

    let n = 0
    for await (const d of queryAll(id)) {
      const title = str(d.title_fld)
      if (!title) continue
      const slug = slugify(title)
      const attributes: Record<string, string> = {}
      for (const f of attrFields) { const v = str(d[f.key]); if (v) attributes[f.key] = v }

      const data = {
        categoryId: category.id,
        slug, title,
        legacyPath: `/${base}/${slug}`,
        legacyProPath: proBase ? `/${proBase}/${slug}` : null,
        logoUrl: img(d.image_fld),
        coverUrl: img(d.imgArticolo),
        ratingImage: img(d.starRate),
        refLink: str(d.refLink) ?? str(d.reflink),
        attributes,
        sortOrder: n,
        status: (d._publishStatus === 'DRAFT' ? 'DRAFT' : 'PUBLISHED') as PublishStatus,
        publishedAt: date(d._publishDate) ?? date(d._createdDate),
      }
      const tool = await prisma.tool.upsert({
        where: { wixId: d._id }, update: data, create: { ...data, wixId: d._id },
      })
      const tr = {
        description: str(d.description_fld), fullDescription: str(d.fullDescription),
        whatIs: str(d.cos), howItWorks: str(d.comeFunziona), whenToUse: str(d.quandoUsarlo), tip: str(d.tip),
      }
      await prisma.toolTranslation.upsert({
        where: { toolId_locale: { toolId: tool.id, locale: 'EN' } },
        update: tr, create: { toolId: tool.id, locale: 'EN', ...tr },
      })

      // video tutorial: si abbinano URL, titolo e descrizione per numero (video1/2, titolo1/2, created1/2)
      const keys = Object.keys(d)
      const urls = keys.filter((k) => /video/i.test(k) && !/^titol/i.test(k) && str(d[k])).sort((a, b) => num(a) - num(b))
      const titles = keys.filter((k) => /^titol/i.test(k)).sort((a, b) => num(a) - num(b))
      const descs = keys.filter((k) => /^created\d*$/.test(k)).sort((a, b) => num(a) - num(b))
      await prisma.toolVideo.deleteMany({ where: { toolId: tool.id } })
      for (const [i, k] of urls.entries()) {
        await prisma.toolVideo.create({ data: {
          toolId: tool.id, youtubeUrl: d[k], sortOrder: i,
          titleEn: str(d[titles[i]]), description: str(d[descs[i]]),
          access: Access.PRO, // da decidere: gratis o PRO
        } })
      }
      n++; total++
    }
    console.log(`${id}: ${n} tool`)
  }
  console.log(`Tool importati: ${total}`)
}

async function importBlog() {
  const catByWix = new Map<string, string>()
  for await (const c of queryAll('Blog/Categories', 100)) {
    const slug = str(c.slug) ?? slugify(c.label)
    const row = await prisma.postCategory.upsert({
      where: { wixId: c._id }, update: { slug },
      create: { wixId: c._id, slug, translations: { create: { locale: 'EN', name: c.label } } },
    })
    catByWix.set(c._id, row.id)
  }
  const tagByWix = new Map<string, string>()
  for await (const t of queryAll('Blog/Tags', 100)) {
    const slug = str(t.slug) ?? slugify(t.label)
    const row = await prisma.tag.upsert({
      where: { wixId: t._id }, update: { slug, label: t.label },
      create: { wixId: t._id, slug, label: t.label },
    })
    tagByWix.set(t._id, row.id)
  }
  let n = 0
  for await (const p of queryAll('Blog/Posts', 20)) {
    const slug = str(p.slug) ?? slugify(p.title)
    const data = {
      slug, legacyPath: `/post/${slug}`,
      categoryId: catByWix.get(typeof p.mainCategory === 'string' ? p.mainCategory : p.mainCategory?._id) ?? null,
      coverUrl: img(p.coverImage),
      access: (Array.isArray(p.paidPlans) && p.paidPlans.length ? 'PRO' : 'FREE') as Access,
      featured: !!p.featured, pinned: !!p.pinned,
      status: 'PUBLISHED' as PublishStatus,
      publishedAt: date(p.publishedDate), viewCount: p.viewCount ?? 0,
    }
    const post = await prisma.post.upsert({ where: { wixId: p._id }, update: data, create: { ...data, wixId: p._id } })
    // TODO: richContent (Ricos JSON) -> Markdown. Per ora si usa il testo semplice.
    const tr = { title: p.title, excerpt: str(p.excerpt), contentMd: p.plainContent ?? '' }
    await prisma.postTranslation.upsert({
      where: { postId_locale: { postId: post.id, locale: 'EN' } },
      update: tr, create: { postId: post.id, locale: 'EN', ...tr },
    })
    for (const t of Array.isArray(p.tags) ? p.tags : []) {
      const tagId = tagByWix.get(typeof t === 'string' ? t : t?._id)
      if (tagId) await prisma.postTag.upsert({
        where: { postId_tagId: { postId: post.id, tagId } }, update: {}, create: { postId: post.id, tagId },
      })
    }
    n++
  }
  console.log(`Articoli importati: ${n}`)
}

async function main() {
  await importTools()
  await importBlog()
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
