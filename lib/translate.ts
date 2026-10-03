/**
 * Traduzione automatica in italiano di strumenti, articoli e categorie (testi del database).
 * Parte da sola in secondo piano, traduce solo ciò che manca e non tocca mai l'inglese.
 * Serve ANTHROPIC_API_KEY.
 */
import { db } from './db'
import { CATEGORY_NAMES_IT } from './sections-it'

const FAST = () => process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'
const WRITER = () => process.env.AI_MODEL_ARTICLE ?? 'claude-sonnet-5-5'

const SYSTEM = `You are a professional translator for Cryptodroply, a crypto tools directory. Translate from English to natural, clear Italian for crypto beginners and intermediate users. Keep the same tone, sentence length and structure.
Rules: keep Markdown, HTML, links, image URLs, line breaks and emphasis exactly as they are, translating only the visible words. Do not translate brand names, product names, tickers, URLs, email addresses or code. Keep numbers, prices and symbols. Use "crypto", "wallet", "exchange", "airdrop", "staking", "blockchain" as Italians do (do not translate them). Never add comments or explanations. Never use long dashes. Avoid explicit financial or promotional wording in Italian: never write guadagnare, guadagno, guadagni, investire, investimento, investi, rendimento, profitto, soldi or denaro. Use neutral words instead: ottenere, ricevere, usare, valutare, decidere, ricompense, fondi, costi. Never promise returns or results. Answer ONLY with the requested blocks.`

async function ask(model: string, prompt: string, maxTokens: number): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY mancante')
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
    })
    if (res.ok) {
      const j = await res.json()
      return (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    }
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 4000 * (attempt + 1))); continue }
    throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  }
  throw new Error('Anthropic non risponde')
}

/** Traduce un insieme di campi di testo: restituisce solo quelli presenti nella risposta. */
async function translateFields(model: string, fields: Record<string, string | null | undefined>, maxTokens: number): Promise<Record<string, string>> {
  const entries = Object.entries(fields).filter(([, v]) => v && v.trim())
  if (!entries.length) return {}
  const prompt = `Translate each block to Italian. Reply with the same blocks, same names, in the same order:\n<f name="field_name">translated text</f>\n\n` + entries.map(([k, v]) => `<f name="${k}">${v}</f>`).join('\n\n')
  const out = await ask(model, prompt, maxTokens)
  const res: Record<string, string> = {}
  for (const m of out.matchAll(/<f name="([\w]+)">([\s\S]*?)<\/f>/g)) {
    const text = m[2].trim()
    if (text && entries.some(([k]) => k === m[1])) res[m[1]] = text // solo i campi richiesti (mai il segnaposto dell'esempio)
  }
  return res
}

/** Traduce in italiano un solo articolo (anche bozza) e salva la traduzione. Rifà la traduzione se già presente. */
export async function translatePost(postId: string): Promise<void> {
  const en = await db.postTranslation.findUnique({ where: { postId_locale: { postId, locale: 'EN' } } })
  if (!en) throw new Error('Articolo senza testo inglese')
  const tr = await translateFields(WRITER(), { title: en.title, excerpt: en.excerpt, contentMd: en.contentMd, seoTitle: en.seoTitle, seoDescription: en.seoDescription }, 16000)
  if (!tr.title || !tr.contentMd) throw new Error('traduzione italiana vuota')
  await db.postTranslation.upsert({
    where: { postId_locale: { postId, locale: 'IT' } },
    update: { ...tr }, create: { postId, locale: 'IT', title: tr.title, contentMd: tr.contentMd, excerpt: tr.excerpt, seoTitle: tr.seoTitle, seoDescription: tr.seoDescription },
  })
}

let running = false
export const translating = () => running

export type TranslateStats = { categories: number; tools: number; posts: number; failed: number }

/** Traduce ciò che manca. `limit` = numero massimo di strumenti e di articoli per giro (0 = tutti). */
export async function translateMissing(log: (m: string) => void = () => {}, limit = 0): Promise<TranslateStats> {
  const stats: TranslateStats = { categories: 0, tools: 0, posts: 0, failed: 0 }
  if (running) { log('traduzione già in corso'); return stats }
  if (!process.env.ANTHROPIC_API_KEY) { log('ANTHROPIC_API_KEY mancante: traduzione non avviata'); return stats }
  running = true
  try {
    // una volta sola: si cancellano le traduzioni fatte prima della regola sul linguaggio non finanziario, così vengono rifatte
    if (!(await db.jobRun.findUnique({ where: { key: 'translate-it-purge-2' } }))) {
      await db.toolTranslation.deleteMany({ where: { locale: 'IT' } })
      await db.postTranslation.deleteMany({ where: { locale: 'IT' } })
      await db.jobRun.create({ data: { key: 'translate-it-purge-2', note: 'rifatte senza termini finanziari' } })
      log('traduzioni precedenti cancellate, si rifanno con il nuovo linguaggio')
    }
    // categorie: nome italiano fisso (non serve l'IA)
    const cats = await db.category.findMany({ include: { translations: true } })
    for (const c of cats) {
      const name = c.wixId ? CATEGORY_NAMES_IT[c.wixId] : undefined
      if (!name || c.translations.some((t) => t.locale === 'IT')) continue
      await db.categoryTranslation.create({ data: { categoryId: c.id, locale: 'IT', name } }).catch(() => undefined)
      stats.categories++
    }

    // strumenti
    const tools = await db.tool.findMany({
      where: { status: 'PUBLISHED', translations: { some: { locale: 'EN' } }, NOT: { translations: { some: { locale: 'IT', description: { not: null } } } } },
      include: { translations: { where: { locale: 'EN' } } },
      orderBy: { updatedAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })
    log(`strumenti da tradurre: ${tools.length}`)
    for (const tool of tools) {
      const en = tool.translations[0]
      try {
        const tr = await translateFields(FAST(), {
          description: en.description, fullDescription: en.fullDescription, whatIs: en.whatIs, howItWorks: en.howItWorks,
          whenToUse: en.whenToUse, tip: en.tip, seoTitle: en.seoTitle, seoDescription: en.seoDescription,
        }, 6000)
        if (!tr.description && !tr.fullDescription && !tr.whatIs) throw new Error('risposta vuota')
        await db.toolTranslation.upsert({
          where: { toolId_locale: { toolId: tool.id, locale: 'IT' } },
          update: tr, create: { toolId: tool.id, locale: 'IT', ...tr },
        })
        stats.tools++
      } catch (e) {
        stats.failed++
        log(`strumento ${tool.slug}: ${(e as Error).message}`)
      }
    }

    // articoli
    const posts = await db.post.findMany({
      where: { status: 'PUBLISHED', translations: { some: { locale: 'EN' } }, NOT: { translations: { some: { locale: 'IT' } } } },
      include: { translations: { where: { locale: 'EN' } } },
      orderBy: { publishedAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    })
    log(`articoli da tradurre: ${posts.length}`)
    for (const post of posts) {
      const en = post.translations[0]
      try {
        const tr = await translateFields(WRITER(), { title: en.title, excerpt: en.excerpt, contentMd: en.contentMd, seoTitle: en.seoTitle, seoDescription: en.seoDescription }, 16000)
        if (!tr.title || !tr.contentMd) throw new Error('risposta vuota')
        await db.postTranslation.upsert({
          where: { postId_locale: { postId: post.id, locale: 'IT' } },
          update: { ...tr }, create: { postId: post.id, locale: 'IT', title: tr.title, contentMd: tr.contentMd, excerpt: tr.excerpt, seoTitle: tr.seoTitle, seoDescription: tr.seoDescription },
        })
        stats.posts++
      } catch (e) {
        stats.failed++
        log(`articolo ${post.slug}: ${(e as Error).message}`)
      }
    }
    await db.jobRun.upsert({ where: { key: 'translate-it-last' }, update: { ranAt: new Date(), note: JSON.stringify(stats) }, create: { key: 'translate-it-last', note: JSON.stringify(stats) } })
    log(`traduzione finita: ${JSON.stringify(stats)}`)
    return stats
  } finally {
    running = false
  }
}

export async function translationCounts() {
  const [tools, toolsIt, posts, postsIt, last] = await Promise.all([
    db.tool.count({ where: { status: 'PUBLISHED' } }),
    db.toolTranslation.count({ where: { locale: 'IT', description: { not: null }, tool: { status: 'PUBLISHED' } } }),
    db.post.count({ where: { status: 'PUBLISHED' } }),
    db.postTranslation.count({ where: { locale: 'IT', post: { status: 'PUBLISHED' } } }),
    db.jobRun.findUnique({ where: { key: 'translate-it-last' } }),
  ])
  return { tools, toolsIt, posts, postsIt, last }
}
