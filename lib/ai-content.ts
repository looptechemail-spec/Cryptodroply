/**
 * Automazioni di contenuto: notizie -> post social (bozze), articolo settimanale (bozza), newsletter settimanale (bozza).
 * Usa l'API di Claude con la ricerca sul web. Serve ANTHROPIC_API_KEY. Tutto esce come BOZZA, mai pubblicato da solo.
 */
import { db } from './db'
import { siteUrl } from './email'
import { buildDigest, mainList } from './newsletter'
import { slugify } from './v1'
import { SECTIONS } from './sections'
import { tomorrowRome, romeToDate, nextWeekdayRome } from './time'
import { sendToPubler } from './publer'

const PRO_COLLECTIONS = SECTIONS.filter((x) => x.pro).flatMap((x) => x.collections)
const FAST = () => process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'
const WRITER = () => process.env.AI_MODEL_ARTICLE ?? 'claude-sonnet-5-5'

const STYLE = `Write in clear, plain English for crypto beginners and intermediate users. Short sentences. No hype, no price predictions, no financial advice, no promises of profit. Never use long dashes or " - " as punctuation, use commas or full stops. No emojis in articles. State only facts you found in the sources and never invent numbers, quotes or dates. When a tool is about privacy, describe it as protecting personal data and remind readers to follow the laws of their country; never suggest avoiding identity checks, taxes or authorities.`

async function ask(opts: { model: string; system: string; prompt: string; maxTokens: number; searches?: number }): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY mancante')
  // in streaming: le richieste lunghe (ricerca web + testo lungo) non scadono; se la ricerca si interrompe (pause_turn) si riprende
  const messages: any[] = [{ role: 'user', content: opts.prompt }]
  let text = ''
  for (let round = 0; round < 4; round++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: opts.model, max_tokens: opts.maxTokens, system: opts.system, stream: true, messages,
        ...(opts.searches ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: opts.searches }] } : {}),
      }),
    })
    if (!res.ok || !res.body) throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
    const blocks: any[] = []
    let stop = ''
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    const handle = (line: string) => {
      if (!line.startsWith('data:')) return
      const raw = line.slice(5).trim()
      if (!raw || raw === '[DONE]') return
      let ev: any
      try { ev = JSON.parse(raw) } catch { return }
      if (ev.type === 'error') throw new Error(`Anthropic: ${ev.error?.message ?? 'errore'}`)
      if (ev.type === 'content_block_start') blocks[ev.index] = { ...ev.content_block, ...(ev.content_block.type === 'text' ? { text: ev.content_block.text ?? '' } : {}), _json: '' }
      else if (ev.type === 'content_block_delta') {
        const b = blocks[ev.index]
        if (!b) return
        if (ev.delta.type === 'text_delta') b.text = (b.text ?? '') + ev.delta.text
        else if (ev.delta.type === 'input_json_delta') b._json += ev.delta.partial_json
      } else if (ev.type === 'content_block_stop') {
        const b = blocks[ev.index]
        if (b && b._json) { try { b.input = JSON.parse(b._json) } catch { /* ignora */ } }
        if (b) delete b._json
      } else if (ev.type === 'message_delta') stop = ev.delta?.stop_reason ?? stop
    }
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const l of lines) handle(l)
    }
    if (buf) handle(buf)
    const done = blocks.filter(Boolean)
    text += done.filter((b) => b.type === 'text').map((b) => b.text).join('')
    console.log(`[ai] ${opts.model} round ${round + 1} stop=${stop} chars=${text.length}`)
    if (stop !== 'pause_turn') break
    messages.push({ role: 'assistant', content: done })
  }
  return text
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
  const re = /<post\s+channel=["'“”]?(telegram|x)["'“”]?\s+link=["'“”]?([^"'“”>]*)["'“”]?\s*>([\s\S]*?)<\/post>/gi
  const when = tomorrowRome(12)
  const batches = new Map<string, string>()
  let n = 0
  for (const m of out.matchAll(re)) {
    const text = m[3].trim()
    if (text.length < 10) continue
    const link = /^https?:\/\//.test(m[2]) ? m[2] : null
    const k = link ?? text.slice(0, 20)
    if (!batches.has(k)) batches.set(k, Math.random().toString(36).slice(2, 10) + Date.now().toString(36))
    const batch = batches.get(k)!
    await db.socialPost.create({ data: { channel: m[1].toLowerCase(), text: text.slice(0, 3900), linkUrl: link, scheduledAt: when, source: 'news', batch } })
    n++
    if (m[1].toLowerCase() === 'telegram') {
      const fb = text.replace(/#\w+/g, '').trim()
      await db.socialPost.create({ data: { channel: 'facebook', text: fb.slice(0, 3000), linkUrl: link, scheduledAt: when, source: 'news', batch } })
      n++
    }
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
  const batch = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  for (const m of out.matchAll(/<post channel="(telegram|x|facebook)">([\s\S]*?)<\/post>/gi)) {
    const text = m[2].trim().replace(/\s*https?:\/\/\S+\s*$/, '')
    if (text.length < 10) continue
    await db.socialPost.create({ data: { channel: m[1].toLowerCase(), text: text.slice(0, 3000), linkUrl: link, scheduledAt: when, source: 'tool', batch } })
    n++
  }
  if (!n) throw new Error('nessun post nella risposta')
  return `${n} bozze su ${tool.title}, programmate ${when.toISOString()}`
}


// --- piano settimanale social: 7 giorni, X + Telegram + Facebook, bozze su Publer ---------------

/** Già pubblicati o caricati a mano su Publer prima dell'automazione: non si ripropongono. */
const ALREADY_USED = ['safepal-wallet', 'htx', 'phalcon-expl', 'airdrops-io', 'oobit', 'rabby-wallet', 'jupiter', 'goplus', 'galxe', 'travala', 'defillama', 'trezor-wallet', 'uniswap', 'pocket-universe', 'layer3', 'kast', 'dexscreener', 'mica-is-here-which-exchange-and-wallet-to-choose-to-stay-operational-and-keep-control-of-your-funds', 'how-to-prepare-for-crypto-airdrops-full-setup-guide-2026', 'cex-vs-dex-how-crypto-exchanges-work-and-how-to-use-them-safely']

const WEEK_SLOTS: { label: string; cats: string[] }[] = [
  { label: 'Wallet', cats: ['cold-wallet', 'hot-wallet'] },
  { label: 'Exchange', cats: ['exchange-cex', 'exchange-dex'] },
  { label: 'Tools', cats: ['tools-security'] },
  { label: 'Free Crypto', cats: ['airdrop', 'task-platform', 'faucet', 'gaming-metaverse'] },
  { label: 'Spend', cats: ['crypto-card', 'spending-tools'] },
  { label: 'Blog', cats: [] },
  { label: 'Tools', cats: ['tools-analysis'] },
]

const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((x) => x[1])
const clean = (t?: string | null) => (t ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

/** Lunedì successivo (ora di Roma) come YYYY-MM-DD. */
export function nextMondayRome(): string {
  const d = new Date(Date.now() + 2 * 3600000) // ora di Roma approssimata, basta per il giorno
  const wd = (d.getUTCDay() + 6) % 7 // lun=0
  d.setUTCDate(d.getUTCDate() + (7 - wd))
  return d.toISOString().slice(0, 10)
}

/**
 * Prepara la settimana che inizia al lunedì indicato: 7 giorni alle 10:00 ora di Roma, un post per X, Telegram e Facebook.
 * Sceglie strumenti gratuiti non ancora usati, controlla sul web notizie recenti negative, scrive i testi e li manda a Publer come BOZZE.
 */
export async function runWeekPlan(monday: string): Promise<string> {
  const used = await db.socialPost.findMany({ where: { linkUrl: { not: null } }, select: { linkUrl: true }, take: 1000 })
  const usedLinks = used.map((u) => u.linkUrl ?? '')
  const isUsed = (slug: string) => ALREADY_USED.includes(slug) || usedLinks.some((l) => l.endsWith('/' + slug))

  type Cand = { key: string; title: string; link: string; facts: string }
  const slots: Cand[][] = []
  for (const slot of WEEK_SLOTS) {
    let cands: Cand[] = []
    if (!slot.cats.length) {
      const posts = await db.post.findMany({ where: { status: 'PUBLISHED', access: 'FREE' }, include: { translations: true }, orderBy: { publishedAt: 'desc' }, take: 60 })
      cands = shuffle(posts.filter((p) => !isUsed(p.slug))).slice(0, 2).map((p) => {
        const t = p.translations.find((x) => x.locale === 'EN') ?? p.translations[0]
        return { key: p.slug, title: clean(t?.title), link: `${siteUrl()}/post/${p.slug}`, facts: clean(t?.excerpt) }
      })
    } else {
      const tools = await db.tool.findMany({
        where: { status: 'PUBLISHED', category: { slug: { in: slot.cats }, wixId: { notIn: PRO_COLLECTIONS } } },
        include: { translations: true, category: true }, take: 200,
      })
      cands = shuffle(tools.filter((t) => !isUsed(t.slug) && t.translations.some((x) => x.locale === 'EN' && x.description))).slice(0, 2).map((t) => {
        const x = t.translations.find((y) => y.locale === 'EN')!
        return { key: t.slug, title: t.title, link: `${siteUrl()}/${t.category.slug}/${t.slug}`, facts: [x.description, x.whatIs, x.fullDescription].map(clean).filter(Boolean).join(' ').slice(0, 1800) }
      })
    }
    slots.push(cands)
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const brief = slots.map((c, i) => `SLOT ${i} (${days[i]}, ${WEEK_SLOTS[i].label}):\n` + (c.length ? c.map((x, j) => `  OPTION ${'AB'[j]}: ${x.title}\n  Facts: ${x.facts}`).join('\n') : '  (no option available, skip this slot)')).join('\n\n')

  const out = await ask({
    model: FAST(), maxTokens: 6000, searches: 10,
    system: `You prepare the weekly social posts of Cryptodroply, a directory of crypto tools. ${STYLE}`,
    prompt: `For each SLOT below pick ONE option and write three versions of its post. Before choosing, search the web for the last 30 days: if an option had a hack, exploit, shutdown, regulatory action or major scam reports, skip it and take the other option. If both are risky, skip the slot.
Use only the facts given, invent nothing. For tool slots find the official X handle with a web search (@name) and use it only if you are sure, otherwise leave the handle line out. For the blog slot there is no handle.
Format of each version (exact, keep the blank lines):
EMOJI Name (or "📖 Blog: title")

2 to 3 short lines of plain facts.

(X version only) @handle

#Tag1 #Tag2 #Tag3 #Tag4

Do NOT add the link, it is added later. The X version is under 280 characters without hashtags and link where possible. Telegram and Facebook versions are the same text without the @handle line.
Answer ONLY with blocks like this, one per slot you keep, plus one <note> at the end with the options you skipped and why:
<slot n="0" pick="A"><x>...</x><tg>...</tg><fb>...</fb></slot>
<note>...</note>

${brief}`,
  })

  let n = 0, sent = 0
  const errors: string[] = []
  for (const m of out.matchAll(/<slot n="(\d)" pick="([AB])">([\s\S]*?)<\/slot>/g)) {
    const i = Number(m[1]); const cand = slots[i]?.['AB'.indexOf(m[2])]
    if (!cand) continue
    const dayDate = new Date(`${monday}T00:00:00Z`); dayDate.setUTCDate(dayDate.getUTCDate() + i)
    const when = romeToDate(`${dayDate.toISOString().slice(0, 10)}T10:00`)
    const batch = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    for (const [ch, tagName] of [['x', 'x'], ['telegram', 'tg'], ['facebook', 'fb']] as const) {
      const text = tag(m[3], tagName)
      if (text.length < 20) continue
      const row = await db.socialPost.create({ data: { channel: ch, text: text.slice(0, 3000), linkUrl: cand.link, scheduledAt: when, source: 'tool', batch } })
      n++
      try {
        const job = await sendToPubler(row, 'draft')
        await db.socialPost.update({ where: { id: row.id }, data: { status: 'PUBLER', publerRef: `draft:${job}`, sentAt: new Date() } })
        sent++
      } catch (e) {
        errors.push((e as Error).message.slice(0, 120))
        await db.socialPost.update({ where: { id: row.id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
      }
    }
  }
  if (!n) throw new Error('nessun post nella risposta')
  return `Settimana ${monday}: ${n} post creati, ${sent} bozze su Publer${errors.length ? ` | errori: ${[...new Set(errors)].join(' ; ')}` : ''} | ${tag(out, 'note').slice(0, 200)}`
}


/**
 * Pubblica un articolo (da bozza) e programma su Publer i post per X, Telegram e Facebook
 * nel prossimo martedì (day=1) o giovedì (day=3) alle 10:00 ora di Roma. day=null: solo pubblica.
 */
export async function publishArticle(postId: string, day: 'tue' | 'thu' | null): Promise<string> {
  const post = await db.post.findUnique({ where: { id: postId }, include: { translations: true } })
  if (!post) throw new Error('articolo non trovato')
  const t = post.translations.find((x) => x.locale === 'EN') ?? post.translations[0]
  if (!t) throw new Error('articolo senza testo')
  await db.post.update({ where: { id: post.id }, data: { status: 'PUBLISHED', publishedAt: post.publishedAt ?? new Date() } })
  if (!day) return 'Articolo pubblicato'
  return await articleSocial(postId, nextWeekdayRome(day === 'tue' ? 1 : 3, 10))
}

/** I tre post (X, Telegram, Facebook) che annunciano un articolo, programmati su Publer all'ora indicata. */
export async function articleSocial(postId: string, when: Date): Promise<string> {
  const post = await db.post.findUnique({ where: { id: postId }, include: { translations: true } })
  if (!post) throw new Error('articolo non trovato')
  const t = post.translations.find((x) => x.locale === 'EN') ?? post.translations[0]
  if (!t) throw new Error('articolo senza testo')
  const link = `${siteUrl()}/post/${post.slug}`
  const out = await ask({
    model: FAST(), maxTokens: 1200,
    system: `You write social posts for Cryptodroply, a directory of crypto tools. ${STYLE}`,
    prompt: `Write three posts announcing this new blog article. Use only what the article says, invent nothing.
Title: ${t.title}
Summary: ${t.excerpt ?? ''}
Article start: ${clean(t.contentMd).slice(0, 2500)}
Format of each post, keep the blank lines: "📖 Blog: <short title>" then a blank line, then 2 to 3 short lines saying what the reader learns, then a blank line, then 3 or 4 hashtags. Do not add the link, it is added later. One emoji at the start only.
Answer ONLY with:
<x>...</x><tg>...</tg><fb>...</fb>`,
  })
  const errors: string[] = []
  let ok = 0
  const batch = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  for (const [ch, tg] of [['x', 'x'], ['telegram', 'tg'], ['facebook', 'fb']] as const) {
    const text = tag(out, tg)
    if (text.length < 20) continue
    const row = await db.socialPost.create({ data: { channel: ch, text: text.slice(0, 3000), linkUrl: link, scheduledAt: when, source: 'article', batch } })
    try {
      const job = await sendToPubler(row, 'scheduled')
      await db.socialPost.update({ where: { id: row.id }, data: { status: 'PUBLER', publerRef: `scheduled:${job}`, sentAt: new Date() } })
      ok++
    } catch (e) {
      errors.push((e as Error).message.slice(0, 150))
      await db.socialPost.update({ where: { id: row.id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
    }
  }
  return `${ok} post programmati su Publer per ${when.toISOString()}${errors.length ? ` | errori: ${[...new Set(errors)].join(' ; ')}` : ''}`
}


/** Notizia o contenuto incollato (testo o indirizzo web) -> tre bozze (X, Telegram, Facebook) per Publer. */
export async function runNewsFromText(input: string, whenLocal?: string): Promise<string> {
  return `${(await runNewsDrafts(input, whenLocal)).length} bozze create`
}

/** Come sopra, ma restituisce gli id dei post creati. */
export async function runNewsDrafts(input: string, whenLocal?: string): Promise<string[]> {
  const raw = input.trim()
  if (raw.length < 15) throw new Error('Incolla un testo o un indirizzo web')
  let source = raw, link: string | null = null
  if (/^https?:\/\/\S+$/.test(raw)) {
    link = raw
    const res = await fetch(raw, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; CryptodroplyBot)' } }).catch(() => null)
    if (!res?.ok) throw new Error('Non riesco ad aprire quell\'indirizzo, incolla il testo')
    source = (await res.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 7000)
  } else {
    link = raw.match(/https?:\/\/\S+/)?.[0] ?? null
  }
  const mk = (model: string) => ask({
    model, maxTokens: 1500,
    system: `You write social posts for Cryptodroply, a directory of crypto tools. ${STYLE}`,
    prompt: `Write three posts about the content below for ordinary crypto users. Use only what the content says, invent nothing, no price talk.
Telegram: 3 to 5 short lines, one emoji allowed. X: under 250 characters before the link, at most 2 hashtags. Facebook: 3 to 4 short lines, no hashtags.
Do not add any link, it is added later.
Answer ONLY with:
<tg>...</tg><x>...</x><fb>...</fb>

CONTENT:
${source}`,
  })
  let out = await mk(FAST()).catch(() => '')
  if (!tag(out, 'x') && !tag(out, 'tg')) out = await mk(WRITER())
  const when = whenLocal ? romeToDate(whenLocal) : tomorrowRome(12)
  const ids: string[] = []
  const batch = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  for (const [ch, tg] of [['x', 'x'], ['telegram', 'tg'], ['facebook', 'fb']] as const) {
    const text = tag(out, tg)
    if (text.length < 15) continue
    const row = await db.socialPost.create({ data: { channel: ch, text: text.slice(0, 3000), linkUrl: link, scheduledAt: when, source: 'news', batch } })
    ids.push(row.id)
  }
  if (!ids.length) throw new Error('nessun post nella risposta')
  return ids
}

/** Pagina SEO pubblicata -> tre bozze (X, Telegram, Facebook) su Publer, con il link alla pagina. */
export async function runSocialForSeoPage(slug: string, whenLocal?: string): Promise<string> {
  const page = await db.seoPage.findUnique({ where: { slug } })
  if (!page) throw new Error('pagina non trovata')
  const link = `${siteUrl()}/best/${page.slug}`
  const out = await ask({
    model: FAST(), maxTokens: 1000,
    system: `You write social posts for Cryptodroply, a directory of crypto tools. ${STYLE}`,
    prompt: `Write three posts announcing this curated list page. Use only what the text says, invent nothing, no price talk.
Title: ${page.title}
Intro: ${clean(page.intro).slice(0, 1500)}
Telegram: 3 to 5 short lines, one emoji allowed. X: under 250 characters before the link, at most 2 hashtags. Facebook: 3 to 4 short lines, no hashtags.
Do not add the link, it is added later.
Answer ONLY with:
<tg>...</tg><x>...</x><fb>...</fb>`,
  })
  const when = whenLocal ? romeToDate(whenLocal) : tomorrowRome(12)
  let n = 0
  const batch = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  const errors: string[] = []
  for (const [ch, tg] of [['x', 'x'], ['telegram', 'tg'], ['facebook', 'fb']] as const) {
    const text = tag(out, tg)
    if (text.length < 15) continue
    const row = await db.socialPost.create({ data: { channel: ch, text: text.slice(0, 3000), linkUrl: link, scheduledAt: when, source: 'news', batch } })
    try {
      const job = await sendToPubler(row, 'draft')
      await db.socialPost.update({ where: { id: row.id }, data: { status: 'PUBLER', publerRef: `draft:${job}`, sentAt: new Date() } })
      n++
    } catch (e) { errors.push((e as Error).message.slice(0, 120)) }
  }
  if (!n) throw new Error(errors[0] ?? 'nessun post nella risposta')
  return `${n} bozze su Publer${errors.length ? ` (errori: ${[...new Set(errors)].join('; ')})` : ''}`
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
  return `"${title}" -> ${siteUrl()}/admin/articles`
}

/**
 * Analisi settimanale di un progetto crypto (categoria "Weekly Crypto analysis", riservata a PRO), in bozza.
 * Stessa struttura delle analisi già pubblicate: dati base, team, tecnologia, utilità, tokenomics, staking, mercato, il mio parere, consigli, segnali di rischio, avvertenza.
 */
export async function runWeeklyAnalysis(project: string, notes = ''): Promise<{ id: string; title: string }> {
  const name = project.trim()
  if (name.length < 2) throw new Error('Scrivi il nome del progetto da analizzare')
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Europe/Rome' })
  const out = await ask({
    model: WRITER(), maxTokens: 12000, searches: 12,
    system: `You are the analyst of Cryptodroply, a directory of crypto tools. You write the PRO "Weekly Crypto analysis": a fundamental analysis of one crypto project for subscribers. It is educational and neutral: never give buy or sell advice, never predict prices, never promise returns, never say a token will go up. Facts only, with the figure and the date it refers to; when a number cannot be verified say so plainly instead of guessing, and give ranges when trackers disagree. Plain, direct English, short paragraphs, no hype. Never use long dashes as punctuation in your own sentences, use commas or full stops. Use the official site, documentation, whitepaper, GitHub, block explorer, audit reports, CoinGecko or CoinMarketCap, DefiLlama and reliable news. Today is ${today}.`,
    prompt: `Write the weekly analysis of this project: ${name}
${notes.trim() ? `Instructions from the editor (follow them): ${notes.trim()}\n` : ''}Search the web first: official site, docs, whitepaper, team, funding, audits, tokenomics, unlocks, market data, competitors, recent news.

Follow EXACTLY this structure and these section titles, in markdown. Inside each section use bold labels as shown ("**Label:** text"), and put each label on its own line, with a blank line between lines so that markdown renders them as separate paragraphs.

**Date:** ${today}
**Category:** (what kind of project, one line)
**Timeframe:** (the horizon this analysis refers to, for example "Medium to long term")

## 📋 BASIC DATA
Name, Ticker, Category, Launch date (founding, testnet, token sale, mainnet), Website, Documentation, Whitepaper (or say none was found), GitHub, Block Explorer (with contract addresses or explorers where verifiable).

## 👥 TEAM & PROJECT
A few paragraphs on who founded it, history, key events (acquisitions, pivots, incidents). Then the labels: Team (public or anonymous, names), Open source (yes or no, what), Backed by, Total raised, Audits (who, when, what was found, and whether newer parts are unaudited).

## ⚙️ TECHNOLOGY
Labels: Blockchain, Consensus, Smart contracts, Layer, Custodial, EVM compatible, TPS / Finality, Audits. Then one or two paragraphs on how it works, with one simple analogy for a beginner.

## 🎯 PURPOSE & UTILITY
Labels: What it does, The problem it solves, Who it is useful for, Real use cases (Live and operational / Announced or in progress), Direct competitors (with how it differs).

## 🪙 TOKENOMICS
Labels: Max supply, Circulating supply, Market cap, FDV, Token launched, ICO / TGE price, Current price, Inflationary / deflationary, Burn mechanism, Token needed to use the protocol, then the allocation breakdown and vesting.

## 💰 STAKING & YIELD
Labels: Staking available, Mechanism, APY (only if verifiable, with date, and say that it is not guaranteed), Lock-up, Where to stake. Never present yield as an opportunity.

## 📊 MARKET DATA (reference only, not financial advice)
Labels: Market cap, FDV, Rank, ATH, ATL, Current price, Distance from ATH, Main exchanges, Liquidity, Next major unlock.

## 🧠 MY TAKE
Sub-labels: Why I selected it, Strengths, Weaknesses and open questions, Who might find it interesting (and who it is not a fit for). Neutral and balanced.

## 💡 PRO TIPS
3 to 5 practical checks the reader can do by themselves (where to verify, what to monitor, what to read), written as education, not as instructions to trade.

## 🚩 RED FLAGS
The concrete risks found: concentration, unlocks, centralization, audits missing, regulatory issues, drawdown, anything unverified. Be specific.

## ⚖️ DISCLAIMER
This content is exclusively for informational and educational purposes and does not constitute financial advice. The crypto world changes fast: team, technology, tokenomics, and the purpose of a project can evolve, change radically, or cease to exist without notice. Everything you read here is a snapshot of the moment this analysis was written. The future is unpredictable for anyone. Do your own research. DYOR.

Then add a final "## Sources" section with a markdown link for every source used.

Answer ONLY in this format:
<title>${name} (TICKER), Fundamental Analysis</title>
<excerpt>one sentence summary, under 160 characters, neutral</excerpt>
<body>the full analysis in markdown</body>`,
  })
  const title = tag(out, 'title'), excerpt = tag(out, 'excerpt'), body = tag(out, 'body')
  if (!title || body.length < 4000 || !/BASIC DATA/.test(body)) throw new Error('analisi incompleta, riprova')
  let slug = slugify(title)
  if (await db.post.findUnique({ where: { slug } })) slug += '-' + Date.now().toString(36).slice(-4)
  const cat = await db.postCategory.findUnique({ where: { slug: 'weekly-crypto-analysis' } })
  const post = await db.post.create({ data: { slug, legacyPath: `/post/${slug}`, access: 'PRO', status: 'DRAFT', categoryId: cat?.id ?? null } })
  await db.postTranslation.create({ data: { postId: post.id, locale: 'EN', title, excerpt, contentMd: body, seoTitle: title.slice(0, 60), seoDescription: excerpt.slice(0, 155) } })
  return { id: post.id, title }
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
  if (wd === 'Fri' && hour >= 9 && hour < 15 && process.env.PUBLER_API_KEY) {
    const monday = nextMondayRome()
    // le settimane già caricate a mano (fino al 18 ottobre) non si rifanno
    if (monday >= (process.env.WEEKPLAN_FROM ?? '2026-10-19')) await once(`weekplan-${monday}`, () => runWeekPlan(monday), log)
  }
}
