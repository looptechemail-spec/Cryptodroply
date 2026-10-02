/**
 * Automazioni di contenuto: notizie -> post social (bozze), articolo settimanale (bozza), newsletter settimanale (bozza).
 * Usa l'API di Claude con la ricerca sul web. Serve ANTHROPIC_API_KEY. Tutto esce come BOZZA, mai pubblicato da solo.
 */
import { db } from './db'
import { siteUrl } from './email'
import { buildDigest, mainList } from './newsletter'
import { slugify } from './v1'
import { SECTIONS } from './sections'
import { tomorrowRome } from './time'

const PRO_COLLECTIONS = SECTIONS.filter((x) => x.pro).flatMap((x) => x.collections)
const FAST = () => process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'
const WRITER = () => process.env.AI_MODEL_ARTICLE ?? 'claude-sonnet-5-5'

const STYLE = `Write in clear, plain English for crypto beginners and intermediate users. Short sentences. No hype, no price predictions, no financial advice, no promises of profit. Never use long dashes or " - " as punctuation, use commas or full stops. No emojis in articles. State only facts you found in the sources and never invent numbers, quotes or dates.`

async function ask(opts: { model: string; system: string; prompt: string; maxTokens: number; searches?: number }): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY mancante')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model, max_tokens: opts.maxTokens, system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
      ...(opts.searches ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: opts.searches }] } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
  const j = await res.json()
  return (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
}

const tag = (s: string, name: string) => s.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i'))?.[1]?.trim() ?? ''

/** Notizie crypto delle ultime 24 ore -> bozze di post per Telegram e X. */
export async function runDailySocial(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const out = await ask({
    model: FAST(), maxTokens: 3000, searches: 6,
    system: `You write social posts for Cryptodroply, a directory of crypto tools (wallets, exchanges, airdrops, privacy, security, analysis). ${STYLE}`,
    prompt: `Today is ${today}. Search the web for the 3 most useful crypto news from the last 24 hours for ordinary users: security incidents, airdrops, wallet or exchange updates, regulation that changes what users can do. Skip price talk and rumors.
For each story write two posts: one for Telegram (2 to 4 short lines, can use one emoji) and one for X (under 260 characters, no hashtags spam, at most 2 hashtags). Each post must end with the source link.
Answer ONLY with blocks in this exact format, nothing else:
<post channel="telegram" link="SOURCE_URL">text</post>
<post channel="x" link="SOURCE_URL">text</post>`,
  })
  const re = /<post channel="(telegram|x)" link="([^"]*)">([\s\S]*?)<\/post>/gi
  let n = 0
  for (const m of out.matchAll(re)) {
    const text = m[3].trim()
    if (text.length < 10) continue
    await db.socialPost.create({ data: { channel: m[1].toLowerCase(), text: text.slice(0, 3900), linkUrl: /^https?:\/\//.test(m[2]) ? m[2] : null } })
    n++
  }
  if (!n) throw new Error('nessun post nella risposta')
  return n
}


/** Post su uno strumento (Telegram, X, Facebook) programmati per domani alle 12:00 ora di Roma, in bozza. Senza nome sceglie uno strumento gratuito non ancora usato. */
export async function runToolSocial(query?: string, when: Date = tomorrowRome(12)): Promise<string> {
  const base = {
    status: 'PUBLISHED' as const,
    category: { wixId: { notIn: PRO_COLLECTIONS } },
  }
  let tool = query
    ? await db.tool.findFirst({ where: { ...base, title: { contains: query, mode: 'insensitive' } }, include: { translations: true, category: true } })
    : null
  if (query && !tool) throw new Error(`Strumento "${query}" non trovato`)
  if (!tool) {
    const used = await db.socialPost.findMany({ where: { linkUrl: { not: null } }, select: { linkUrl: true }, take: 500 })
    const usedSet = new Set(used.map((u) => u.linkUrl))
    const all = await db.tool.findMany({ where: base, include: { translations: true, category: true }, take: 300 })
    const fresh = all.filter((t) => !usedSet.has(`${siteUrl()}/${t.category.slug}/${t.slug}`) && t.translations.some((x) => x.locale === 'EN' && x.description))
    if (!fresh.length) throw new Error('Nessuno strumento nuovo da proporre')
    tool = fresh[Math.floor(Math.random() * fresh.length)]
  }
  const t = tool.translations.find((x) => x.locale === 'EN') ?? tool.translations[0]
  const link = `${siteUrl()}/${tool.category.slug}/${tool.slug}`
  const facts = [t?.description, t?.whatIs, t?.fullDescription].filter(Boolean).join('\n').replace(/<[^>]+>/g, ' ').slice(0, 2500)
  const out = await ask({
    model: FAST(), maxTokens: 1200,
    system: `You write social posts for Cryptodroply, a directory of crypto tools. ${STYLE}`,
    prompt: `Write three posts presenting this tool to ordinary users. Use only the facts below, invent nothing.
Tool: ${tool.title}
Facts:
${facts}
Link to put at the end of each post: ${link}
Telegram: 3 to 5 short lines, one emoji allowed. X: under 250 characters before the link, at most 2 hashtags. Facebook: 3 to 4 short lines, friendly, no hashtags.
Answer ONLY with these blocks:
<post channel="telegram">text</post>
<post channel="x">text</post>
<post channel="facebook">text</post>`,
  })
  let n = 0
  for (const m of out.matchAll(/<post channel="(telegram|x|facebook)">([\s\S]*?)<\/post>/gi)) {
    const text = m[2].trim().replace(/\s*https?:\/\/\S+\s*$/, '')
    if (text.length < 10) continue
    await db.socialPost.create({ data: { channel: m[1].toLowerCase(), text: text.slice(0, 3000), linkUrl: link, scheduledAt: when } })
    n++
  }
  if (!n) throw new Error('nessun post nella risposta')
  return `${n} bozze su ${tool.title}, programmate ${when.toISOString()}`
}

/** Un articolo per il blog, in bozza, su un tema di attualità utile ai principianti. */
export async function runWeeklyArticle(topicHint?: string): Promise<string> {
  const recent = await db.postTranslation.findMany({ where: { locale: 'EN' }, orderBy: { post: { createdAt: 'desc' } }, take: 25, select: { title: true } })
  const out = await ask({
    model: WRITER(), maxTokens: 6000, searches: 8,
    system: `You are an editor of the Cryptodroply blog, a crypto tools directory. ${STYLE}`,
    prompt: `Write one blog article of 800 to 1100 words.
${topicHint ? `Topic: ${topicHint}` : 'Pick the most useful topic for crypto users from this week\'s news (a security threat, a new airdrop type, a wallet or exchange change, a regulation that affects users). Search the web first.'}
Do not repeat these recent titles: ${recent.map((r) => r.title).join(' | ')}
Structure: a short intro, 3 to 5 sections with ## headings, bold for key terms, short paragraphs, a "What to do" section with practical steps, and a final "Sources" section with a markdown link for every source you used. End with one line: "This article is for information only and is not financial advice."
Answer ONLY in this format:
<title>article title, under 70 characters</title>
<excerpt>one sentence summary, under 160 characters</excerpt>
<body>full article in markdown</body>`,
  })
  const title = tag(out, 'title'), excerpt = tag(out, 'excerpt'), body = tag(out, 'body')
  if (!title || body.length < 600) throw new Error('articolo incompleto')
  let slug = slugify(title)
  if (await db.post.findUnique({ where: { slug } })) slug += '-' + Date.now().toString(36).slice(-4)
  const post = await db.post.create({ data: { slug, legacyPath: `/post/${slug}`, access: 'FREE', status: 'DRAFT' } })
  await db.postTranslation.create({ data: { postId: post.id, locale: 'EN', title, excerpt, contentMd: body, seoTitle: title.slice(0, 60), seoDescription: excerpt.slice(0, 155) } })
  return `${siteUrl()}/post/${slug}`
}

/** Bozza della newsletter settimanale con gli articoli gratuiti della settimana. */
export async function runWeeklyDigest(): Promise<string> {
  const d = await buildDigest()
  if (!d) throw new Error('nessun articolo nuovo questa settimana')
  const list = await mainList()
  const c = await db.campaign.create({ data: { listId: list.id, subject: d.subject, bodyHtml: d.bodyHtml } })
  return c.id
}

// --- pianificazione (ora di Roma) ----------------------------------------------------------

const rome = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, wd: p.weekday as string }
}

async function once(key: string, fn: () => Promise<unknown>, log: (m: string) => void) {
  try { await db.jobRun.create({ data: { key } }) } catch { return } // già eseguito o in corso
  try {
    const r = await fn()
    await db.jobRun.update({ where: { key }, data: { note: String(r).slice(0, 200) } })
    log(`${key}: ok`)
  } catch (e) {
    await db.jobRun.delete({ where: { key } }).catch(() => undefined) // riprova al prossimo controllo
    log(`${key}: errore ${(e as Error).message}`)
  }
}

/** Chiamata ogni ora. Gira solo con AUTOMATION_ENABLED=true e ANTHROPIC_API_KEY. */
export async function tickAutomation(log: (m: string) => void = () => {}) {
  if (process.env.AUTOMATION_ENABLED !== 'true' || !process.env.ANTHROPIC_API_KEY) return
  const { date, hour, wd } = rome()
  if (hour >= 8 && hour < 14) await once(`social-${date}`, runDailySocial, log)
  if (wd === 'Mon' && hour >= 9 && hour < 15) await once(`article-${date}`, () => runWeeklyArticle(), log)
  if (wd === 'Fri' && hour >= 10 && hour < 16) await once(`digest-${date}`, runWeeklyDigest, log)
}
