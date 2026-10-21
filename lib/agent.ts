/**
 * Agente Telegram di Cryptodroply: capisce i messaggi di Nicolò (Claude via API), legge lo stato del sito,
 * prepara le azioni e le esegue solo dopo il suo OK (pulsanti Approva / Scarta). Tutto passa dal registro AgentTask,
 * che condivide con Claude (sessioni di lavoro sul codice) e con gli avvisi del sistema.
 */
import { db } from './db'
import { siteUrl, sendEmail } from './email'
import { publishNow, scheduleArticle, saveCover } from './articles'
import { sendToPubler } from './publer'
import { romeToDate, dateToRome, tomorrowRome } from './time'
import { runWeeklyArticle, runWeekPlan, nextMondayRome, runWeeklyDigest, runDailySocial, runWeeklyAnalysis, proposeNewsPost, suggestAnalysisIdeas } from './ai-content'
import { tg, sendOwner, ownerChat, agentToken, mutedUntil, setMute, type Button } from './tgbot'

const MODEL = () => process.env.AI_MODEL_AGENT ?? 'claude-sonnet-5-5'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

type Mode = 'read' | 'safe' | 'approve'
type Tool = {
  name: string; description: string; mode: Mode
  schema: { properties: Record<string, unknown>; required?: string[] }
  /** Solo per 'approve': controlla i dati e descrive cosa succederà. Lancia un errore se non si può fare. */
  prepare?: (a: any) => Promise<{ title: string; detail: string }>
  run: (a: any) => Promise<string>
}

/** Analisi PRO = l'analisi di una moneta/progetto (categoria Weekly Crypto analysis). Tutto il resto (tutorial, news, guide) è un articolo normale. */
const ANALYSIS_WHERE = { OR: [{ category: { slug: 'weekly-crypto-analysis' } }, { access: 'PRO' as const, categoryId: null }] }
const isAnalysis = (p: { access: string; categoryId?: string | null; category?: { slug: string } | null }) => p.category?.slug === 'weekly-crypto-analysis' || (p.access === 'PRO' && !p.categoryId)

const enTitle = (t: { locale: string; title: string | null }[]) => t.find((x) => x.locale === 'EN')?.title ?? t[0]?.title ?? '(senza titolo)'

async function postOrThrow(id: string) {
  const post = await db.post.findUnique({ where: { id: String(id) }, include: { translations: true, category: true } })
  if (!post) throw new Error('Articolo non trovato: controlla l’id con list_drafts')
  return post
}

const TOOLS: Tool[] = [
  {
    name: 'list_drafts', mode: 'read', description: 'Elenca le bozze degli articoli (id, titolo, FREE/PRO, copertina, programmazione).', schema: { properties: {} },
    run: async () => {
      const rows = await db.post.findMany({ where: { status: 'DRAFT' }, orderBy: { createdAt: 'desc' }, take: 15, include: { translations: true } })
      if (!rows.length) return 'Nessuna bozza.'
      return rows.map((p) => `${p.id} | ${enTitle(p.translations)} | ${p.access} | copertina ${p.coverUrl ? 'sì' : 'NO'} | ${p.scheduledAt ? 'programmato ' + dateToRome(p.scheduledAt) : 'non programmato'}`).join('\n')
    },
  },
  {
    name: 'read_article', mode: 'read', description: 'Legge titolo, riassunto e inizio del testo di un articolo.', schema: { properties: { id: { type: 'string' } }, required: ['id'] },
    run: async (a) => {
      const p = await postOrThrow(a.id)
      const t = p.translations.find((x) => x.locale === 'EN') ?? p.translations[0]
      return `${t?.title}\nStato: ${p.status} · ${p.access}\nRiassunto: ${t?.excerpt}\n\n${short(t?.contentMd ?? '', 2500)}`
    },
  },
  {
    name: 'list_messages', mode: 'read', description: 'Messaggi e moduli arrivati dal sito e non ancora gestiti.', schema: { properties: {} },
    run: async () => {
      const rows = await db.formSubmission.findMany({ where: { handled: false }, orderBy: { createdAt: 'desc' }, take: 15 })
      if (!rows.length) return 'Nessun messaggio da gestire.'
      return rows.map((m) => `${m.id} | ${m.type} | ${m.email} | ${short(JSON.stringify(m.payload), 500)}`).join('\n')
    },
  },
  {
    name: 'site_stats', mode: 'read', description: 'Numeri del sito: articoli, strumenti, iscritti, utenti, abbonati PRO.', schema: { properties: {} },
    run: async () => {
      const [posts, drafts, tools, subs, users, pro, msgs] = await Promise.all([
        db.post.count({ where: { status: 'PUBLISHED' } }), db.post.count({ where: { status: 'DRAFT' } }), db.tool.count({ where: { status: 'PUBLISHED' } }),
        db.subscriber.count(), db.user.count(), db.subscription.count({ where: { status: 'ACTIVE' } }), db.formSubmission.count({ where: { handled: false } }),
      ])
      return `Articoli pubblicati ${posts}, bozze ${drafts}, strumenti ${tools}, iscritti newsletter ${subs}, utenti ${users}, abbonati PRO attivi ${pro}, messaggi da gestire ${msgs}.`
    },
  },
  {
    name: 'list_tasks', mode: 'read', description: 'Ultime attività del registro condiviso (proposte, fatte, in coda per Claude, avvisi).', schema: { properties: {} },
    run: async () => taskLines(20),
  },
  {
    name: 'mark_message_handled', mode: 'safe', description: 'Segna un messaggio/modulo come gestito (non invia nulla).', schema: { properties: { id: { type: 'string' } }, required: ['id'] },
    run: async (a) => { await db.formSubmission.update({ where: { id: String(a.id) }, data: { handled: true } }); return 'Segnato come gestito.' },
  },
  {
    name: 'queue_for_claude', mode: 'safe',
    description: 'Per lavori che richiedono modifiche al codice, deploy, Railway, Publer in blocco o analisi lunghe: mette la richiesta in coda per Claude (sessione di lavoro di Nicolò). Descrivi bene cosa serve.',
    schema: { properties: { request: { type: 'string' } }, required: ['request'] },
    run: async (a) => {
      const t = await db.agentTask.create({ data: { kind: 'claude_request', title: short(String(a.request), 200), detail: String(a.request), status: 'QUEUED', source: 'agente' } })
      return `In coda per Claude (id ${t.id}). Lo vedrà alla prossima sessione.`
    },
  },
  {
    name: 'write_article', mode: 'safe',
    description: 'Scrive un articolo normale del blog IN BOZZA (non pubblica nulla) sull’argomento indicato, costruito attorno agli strumenti della directory. Ci vogliono 3-5 minuti; quando è pronto Nicolò riceve la scheda della bozza e può mandare la foto della copertina. Non usarlo per le analisi PRO.',
    schema: { properties: { topic: { type: 'string', description: 'Argomento richiesto, anche con i nomi degli strumenti' } }, required: ['topic'] },
    run: async (a) => { await startJob('article', String(a.topic ?? '').trim()); return 'Scrittura avviata: arriverà la scheda della bozza quando è pronta.' },
  },
  {
    name: 'publish_article', mode: 'approve', description: 'Pubblica subito una bozza (EN + IT). social=true crea anche i post social (le analisi PRO non vengono mai condivise).',
    schema: { properties: { id: { type: 'string' }, social: { type: 'boolean' } }, required: ['id'] },
    prepare: async (a) => {
      const p = await postOrThrow(a.id)
      if (p.status !== 'DRAFT') throw new Error('Non è una bozza')
      if (!p.coverUrl) throw new Error('Manca la copertina: va aggiunta prima (dal pannello Articoli)')
      return { title: `Pubblicare "${enTitle(p.translations)}"`, detail: `${isAnalysis(p) ? 'Analisi PRO (nessun post social).' : a.social ? 'Con post social su Publer tra 15 minuti.' : 'Senza post social.'}` }
    },
    run: async (a) => publishNow(String(a.id), !!a.social),
  },
  {
    name: 'schedule_article', mode: 'approve', description: 'Programma una bozza a una data/ora (ora di Roma, formato YYYY-MM-DDTHH:mm).',
    schema: { properties: { id: { type: 'string' }, when: { type: 'string' }, social: { type: 'boolean' } }, required: ['id', 'when'] },
    prepare: async (a) => {
      const p = await postOrThrow(a.id)
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(a.when))) throw new Error('Formato data non valido')
      if (!p.coverUrl) throw new Error('Manca la copertina')
      return { title: `Programmare "${enTitle(p.translations)}" per il ${String(a.when).replace('T', ' alle ')}`, detail: a.social && !isAnalysis(p) ? 'Con post social alla stessa ora.' : 'Senza post social.' }
    },
    run: async (a) => scheduleArticle(String(a.id), romeToDate(String(a.when)), !!a.social),
  },
  {
    name: 'publish_news', mode: 'approve', description: 'Pubblica SUBITO su Publer una news (post per X e/o Telegram). Mai per analisi PRO.',
    schema: { properties: { posts: { type: 'array', items: { type: 'object', properties: { channel: { type: 'string', enum: ['x', 'telegram', 'facebook'] }, text: { type: 'string' }, link: { type: 'string' } }, required: ['channel', 'text'] } } }, required: ['posts'] },
    prepare: async (a) => {
      const posts = Array.isArray(a.posts) ? a.posts : []
      if (!posts.length) throw new Error('Nessun post')
      return { title: `Pubblicare ora su Publer (${posts.map((x: any) => x.channel).join(' + ')})`, detail: posts.map((x: any) => `[${x.channel}]\n${x.text}`).join('\n\n') }
    },
    run: async (a) => {
      const res: string[] = []
      for (const x of a.posts as { channel: string; text: string; link?: string }[]) {
        try {
          const job = await sendToPubler({ channel: x.channel, text: x.text, linkUrl: x.link ?? null }, 'now')
          await db.socialPost.create({ data: { channel: x.channel, text: x.text.slice(0, 3000), linkUrl: x.link ?? null, source: 'news', status: 'PUBLER', publerRef: `now:${job}`, sentAt: new Date() } })
          res.push(`${x.channel}: inviato`)
        } catch (e) { res.push(`${x.channel}: ERRORE ${(e as Error).message.slice(0, 120)}`) }
      }
      if (res.every((r) => r.includes('ERRORE'))) throw new Error(res.join(' · '))
      return res.join(' · ')
    },
  },
  {
    name: 'unschedule_article', mode: 'approve', description: 'Toglie la programmazione a una bozza (resta bozza). I post social già creati su Publer vanno gestiti a parte.',
    schema: { properties: { id: { type: 'string' } }, required: ['id'] },
    prepare: async (a) => { const p = await postOrThrow(a.id); if (!p.scheduledAt) throw new Error('Non è programmata'); return { title: `Togliere la programmazione a "${enTitle(p.translations)}"`, detail: 'Resta in bozza. Eventuali post Publer già programmati restano da controllare.' } },
    run: async (a) => { await db.post.update({ where: { id: String(a.id) }, data: { scheduledAt: null } }); return 'Programmazione tolta.' },
  },
  {
    name: 'reply_message', mode: 'approve', description: 'Risponde per email a chi ha scritto dal sito (modulo) e segna il messaggio come gestito. Scrivi il testo completo in italiano o inglese secondo chi ha scritto.',
    schema: { properties: { id: { type: 'string' }, text: { type: 'string' } }, required: ['id', 'text'] },
    prepare: async (a) => {
      const m = await db.formSubmission.findUnique({ where: { id: String(a.id) } })
      if (!m?.email) throw new Error('Messaggio non trovato o senza email')
      return { title: `Rispondere a ${m.email}`, detail: String(a.text) }
    },
    run: async (a) => {
      const m = await db.formSubmission.findUnique({ where: { id: String(a.id) } })
      if (!m?.email) throw new Error('Messaggio non trovato')
      const html = String(a.text).split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('')
      const ok = await sendEmail({ to: m.email, subject: 'Re: il tuo messaggio a Cryptodroply', html, replyTo: process.env.CONTACT_TO ?? process.env.EMAIL_FROM })
      if (!ok) throw new Error('Email non inviata (controlla Resend)')
      await db.formSubmission.update({ where: { id: m.id }, data: { handled: true } })
      return `Email inviata a ${m.email}.`
    },
  },
  {
    name: 'set_tool_link', mode: 'approve', description: 'Cambia il link di affiliazione (refLink) o il sito (websiteUrl) di uno strumento. Indica lo slug o il nome.',
    schema: { properties: { tool: { type: 'string' }, field: { type: 'string', enum: ['refLink', 'websiteUrl'] }, url: { type: 'string' } }, required: ['tool', 'field', 'url'] },
    prepare: async (a) => {
      if (!/^https:\/\//.test(String(a.url))) throw new Error('Il link deve iniziare con https://')
      const t = await findTool(String(a.tool))
      return { title: `Cambiare ${a.field} di ${t.title}`, detail: `Prima: ${(t as any)[a.field] ?? '(vuoto)'}\nDopo: ${a.url}` }
    },
    run: async (a) => {
      const t = await findTool(String(a.tool))
      await db.tool.update({ where: { id: t.id }, data: { [a.field]: String(a.url) } })
      return `${t.title}: ${a.field} aggiornato.`
    },
  },
  {
    name: 'social_post', mode: 'approve', description: 'Crea un post su Publer (x, telegram o facebook). Con when (ora di Roma YYYY-MM-DDTHH:mm) lo programma, senza lo lascia in bozza. Mai per analisi PRO.',
    schema: { properties: { channel: { type: 'string', enum: ['x', 'telegram', 'facebook'] }, text: { type: 'string' }, link: { type: 'string' }, when: { type: 'string' } }, required: ['channel', 'text'] },
    prepare: async (a) => {
      if (a.when && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(a.when))) throw new Error('Formato data non valido')
      return { title: `Post ${a.channel}${a.when ? ' programmato ' + String(a.when).replace('T', ' ') : ' (bozza su Publer)'}`, detail: `${a.text}${a.link ? '\n' + a.link : ''}` }
    },
    run: async (a) => {
      const job = await sendToPubler({ channel: String(a.channel), text: String(a.text), linkUrl: a.link ? String(a.link) : null, scheduledAt: a.when ? romeToDate(String(a.when)) : null }, a.when ? 'scheduled' : 'draft')
      return `Inviato a Publer (lavoro ${job}).`
    },
  },
]

async function findTool(q: string) {
  const s = q.trim()
  const rows = await db.tool.findMany({ where: { OR: [{ slug: s }, { title: { contains: s, mode: 'insensitive' } }] }, take: 5 })
  const exact = rows.filter((r) => r.slug === s || r.title.toLowerCase() === s.toLowerCase())
  const use = exact.length === 1 ? exact : rows
  if (use.length !== 1) throw new Error(use.length ? `Più strumenti corrispondono: ${use.map((r) => r.slug).join(', ')}` : 'Strumento non trovato')
  return use[0]
}

async function taskLines(n: number): Promise<string> {
  const rows = await db.agentTask.findMany({ orderBy: { createdAt: 'desc' }, take: n })
  if (!rows.length) return 'Registro vuoto.'
  return rows.map((t) => `${dateToRome(t.createdAt).replace('T', ' ')} [${t.status}] (${t.source}) ${short(t.title, 140)}${t.result ? ' → ' + short(t.result, 120) : ''}`).join('\n')
}

async function propose(tool: Tool, args: any, extra?: Button[]): Promise<string> {
  let p: { title: string; detail: string }
  try { p = await tool.prepare!(args) } catch (e) { return `Non posso proporlo: ${(e as Error).message}` }
  const task = await db.agentTask.create({ data: { kind: tool.name, title: p.title, detail: p.detail, args, status: 'PROPOSED', source: 'agente' } })
  const id = await sendOwner(`🔔 Da approvare\n\n${p.title}\n\n${short(p.detail, 1500)}`, [[{ text: '✅ Approva', data: `a:${task.id}` }, { text: '❌ Scarta', data: `r:${task.id}` }], ...(extra ? [extra] : [])], Boolean(await mutedUntil()))
  if (id) await db.agentTask.update({ where: { id: task.id }, data: { chatMessage: id } })
  return `Proposta inviata a Nicolò con i pulsanti Approva/Scarta (id ${task.id}). Non è ancora eseguita: aspetta il suo OK.`
}

async function execTool(name: string, args: any): Promise<string> {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) return 'Strumento sconosciuto'
  try {
    if (tool.mode === 'approve') return await propose(tool, args)
    const out = await tool.run(args)
    if (tool.mode === 'safe') await db.agentTask.create({ data: { kind: tool.name, title: `${tool.name}`, detail: JSON.stringify(args).slice(0, 500), args, status: 'DONE', source: 'agente', result: out.slice(0, 300) } })
    return out
  } catch (e) { return `Errore: ${(e as Error).message}` }
}

// --- approvazioni -----------------------------------------------------------------------

export async function handleCallback(cb: any) {
  const chat = String(cb.message?.chat?.id ?? '')
  if (chat !== (await ownerChat())) return
  const [act, ...restp] = String(cb.data ?? '').split(':')
  const id = restp.join(':')
  const done = (text: string) => tg('answerCallbackQuery', { callback_query_id: cb.id, text: text.slice(0, 190) }).catch(() => undefined)
  if (act !== 'a' && act !== 'r') return handleAction(act, id, done)
  const task = await db.agentTask.findUnique({ where: { id } })
  if (!task) return void (await done('Attività non trovata'))
  if (!task.chatMessage && cb.message?.message_id) await db.agentTask.update({ where: { id }, data: { chatMessage: cb.message.message_id } })
  if (act !== 'a') { const r = await rejectTask(id); return void (await done(r.ok ? 'Scartata' : r.text)) }
  await done('Eseguo…')
  await approveTask(id)
}

/** Aggiorna il messaggio Telegram della proposta (toglie i pulsanti e mostra l'esito), anche se si approva dal sito. */
async function closeProposalMessage(chatMessage: number | null, text: string) {
  const chat = await ownerChat()
  if (!chat || !chatMessage) return
  await tg('editMessageText', { chat_id: chat, message_id: chatMessage, text: text.slice(0, 3900), reply_markup: { inline_keyboard: [] } }).catch(() => undefined)
}

/** Approva una proposta ed esegue l'azione. Usata dai pulsanti di Telegram e dalla dashboard del sito. */
export async function approveTask(id: string): Promise<{ ok: boolean; text: string }> {
  const claim = await db.agentTask.updateMany({ where: { id, status: 'PROPOSED' }, data: { status: 'RUNNING', result: null } })
  if (!claim.count) return { ok: false, text: 'Già gestita' }
  const task = await db.agentTask.findUnique({ where: { id } })
  if (!task) return { ok: false, text: 'Attività non trovata' }
  const tool = TOOLS.find((t) => t.name === task.kind)
  try {
    if (!tool) throw new Error('azione sconosciuta')
    const out = await tool.run(task.args)
    await db.agentTask.update({ where: { id }, data: { status: 'DONE', result: out.slice(0, 500) } })
    await closeProposalMessage(task.chatMessage, `✅ Fatto\n\n${task.title}\n\n${short(out, 800)}`)
    return { ok: true, text: out }
  } catch (e) {
    const msg = (e as Error).message
    await db.agentTask.update({ where: { id }, data: { status: 'FAILED', result: msg.slice(0, 500) } })
    await closeProposalMessage(task.chatMessage, `⚠️ Non riuscito\n\n${task.title}\n\n${msg}`)
    return { ok: false, text: msg }
  }
}

export async function rejectTask(id: string): Promise<{ ok: boolean; text: string }> {
  const claim = await db.agentTask.updateMany({ where: { id, status: 'PROPOSED' }, data: { status: 'REJECTED', result: 'Scartata da Nicolò' } })
  if (!claim.count) return { ok: false, text: 'Già gestita' }
  const task = await db.agentTask.findUnique({ where: { id } })
  if (task) await closeProposalMessage(task.chatMessage, `❌ Scartata\n\n${task.title}`)
  return { ok: true, text: 'Scartata' }
}

// --- conversazione --------------------------------------------------------------------

async function stateBlock(): Promise<string> {
  const [drafts, msgs, queued, proposed] = await Promise.all([
    db.post.count({ where: { status: 'DRAFT' } }), db.formSubmission.count({ where: { handled: false } }),
    db.agentTask.count({ where: { status: 'QUEUED' } }), db.agentTask.count({ where: { status: 'PROPOSED' } }),
  ])
  return `Ora a Roma: ${dateToRome(new Date()).replace('T', ' ')}. Bozze: ${drafts}. Messaggi da gestire: ${msgs}. Proposte in attesa di OK: ${proposed}. In coda per Claude: ${queued}.\n\nUltime attività del registro:\n${await taskLines(12)}`
}

const SYSTEM = `Sei l'assistente di Nicolò Allodio per Cryptodroply.com (directory di strumenti crypto, EN + /it, abbonamento PRO). Parli con lui su Telegram: rispondi sempre in italiano, breve e concreto, senza giri di parole.
Regole:
- Non dire mai che hai fatto qualcosa se non l'hai fatto tu con uno strumento e il risultato lo conferma. Le azioni che cambiano il sito (pubblicare, programmare, rispondere a clienti, cambiare link, post social) passano da un'approvazione con pulsanti: dopo aver chiamato lo strumento di' solo che hai mandato la proposta e cosa contiene, senza ripeterla tutta.
- Prima di proporre qualcosa leggi i dati (list_drafts, list_messages, read_article). Non inventare id.
- L'analisi PRO è l'analisi di una moneta/progetto (categoria Weekly Crypto analysis) e non si condivide mai sui social. Tutto il resto (articoli normali) si condivide. Gli articoli del blog sono sempre costruiti attorno a uno o più strumenti della directory, con i link alle loro pagine: se Nicolò chiede un articolo, passa da queue_for_claude solo se serve altro; i job automatici lo fanno già così. Non si pubblica senza copertina.
- Per codice, deploy, Railway, grandi operazioni su Publer, immagini o tutto ciò che non hai come strumento: usa queue_for_claude e spiega che lo riprenderà Claude nella sessione di lavoro.
- Hai il registro delle attività (sotto): usalo per sapere cosa è già stato fatto, proposto o chiesto, anche da Claude o dal sistema, e non ripetere cose già fatte.
- Se manca un dato essenziale fai una sola domanda.
- Scrivi in testo semplice, niente tabelle; elenchi brevi solo se servono.`

async function claudeCall(messages: any[], system: string) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY mancante')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL(), max_tokens: 2000, system, messages,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: { type: 'object', ...t.schema } })),
    }),
    signal: AbortSignal.timeout(90000),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  return res.json() as Promise<{ content: any[]; stop_reason: string }>
}

async function converse(text: string): Promise<string> {
  const hist = (await db.agentMsg.findMany({ orderBy: { createdAt: 'desc' }, take: 12 })).reverse()
  const messages: any[] = hist.map((m) => ({ role: m.role, content: m.text }))
  // l'API vuole che si parta da "user" e si alterni
  while (messages.length && messages[0].role !== 'user') messages.shift()
  const merged: any[] = []
  for (const m of [...messages, { role: 'user', content: text }]) {
    if (merged.length && merged[merged.length - 1].role === m.role) merged[merged.length - 1].content += '\n' + m.content
    else merged.push({ ...m })
  }
  const system = SYSTEM + '\n\n=== STATO ATTUALE ===\n' + (await stateBlock())
  let out = ''
  for (let round = 0; round < 8; round++) {
    const r = await claudeCall(merged, system)
    const tools = r.content.filter((b) => b.type === 'tool_use')
    out = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    if (r.stop_reason !== 'tool_use' || !tools.length) break
    merged.push({ role: 'assistant', content: r.content })
    const results = []
    for (const t of tools) results.push({ type: 'tool_result', tool_use_id: t.id, content: short(await execTool(t.name, t.input ?? {}), 6000) })
    merged.push({ role: 'user', content: results })
  }
  await db.agentMsg.createMany({ data: [{ role: 'user', text }, { role: 'assistant', text: out || '(fatto)' }] })
  return out || 'Fatto.'
}

const seen = new Set<number>()
let chain: Promise<unknown> = Promise.resolve()

export function handleUpdate(u: any) {
  if (typeof u.update_id === 'number') { if (seen.has(u.update_id)) return; seen.add(u.update_id); if (seen.size > 200) seen.delete(seen.values().next().value as number) }
  chain = chain.then(() => processUpdate(u)).catch((e) => console.error('[agent] ' + (e as Error).message))
}

async function processUpdate(u: any) {
  if (u.callback_query) return handleCallback(u.callback_query)
  const m = u.message
  if (m && (m.photo?.length || String(m.document?.mime_type ?? '').startsWith('image/'))) {
    if (String(m.chat.id) === (await ownerChat())) await handleCoverPhoto(m).catch((e) => sendOwner('⚠️ Copertina non salvata: ' + (e as Error).message))
    return
  }
  const text: string = (m?.text ?? '').trim()
  if (!m || !text) return
  const chat = String(m.chat.id)
  const reply = (t: string, b?: Button[][]) => tg('sendMessage', { chat_id: chat, text: t.slice(0, 3900), disable_web_page_preview: true, ...(b ? { reply_markup: { inline_keyboard: b.map((r) => r.map((x) => (x.url ? { text: x.text, url: x.url } : { text: x.text, callback_data: x.data })) ) } } : {}) })
  const owner = await ownerChat()

  if (/^\/start\b/.test(text)) {
    const pass = text.replace(/^\/start\s*/, '').trim()
    if (owner) return void (owner === chat ? await sendKeyboard('Ci sono. Usa i tasti in basso o scrivimi cosa serve.') : await reply('Questo bot è privato.'))
    const expected = (process.env.ADMIN_PASSWORD ?? '').trim()
    if (expected && pass === expected) {
      await db.jobRun.upsert({ where: { key: 'agent:owner' }, update: { note: chat }, create: { key: 'agent:owner', note: chat } })
      await sendKeyboard('Collegato ✅ Da ora ti scrivo qui per ciò che richiede la tua decisione e puoi darmi comandi. Usa i tasti in basso.'); return void (await showSection('oggi'))
    }
    return void (await reply('Per collegarti scrivi: /start seguito dalla password dell’admin.'))
  }
  if (!owner || chat !== owner) return // chiunque altro viene ignorato

  const sec = SECTIONS[text] ?? SECTIONS['/' + text.replace(/^\//, '').split(/[@\s]/)[0]]
  if (sec) return void (await showSection(sec))
  if (/^\/menu\b/.test(text)) return void (await sendKeyboard('Tasti attivi. Scrivimi anche a parole: capisco frasi normali.'))
  if (/^\/silenzio\b/.test(text)) {
    const h = Number(text.split(/\s+/)[1] ?? 8) || 8
    await setMute(h)
    return void (await reply(`🔕 Avvisi senza suono per ${h} ore. Li ricevi comunque, solo in silenzio. /attiva per riattivare.`))
  }
  if (/^\/attiva\b/.test(text)) { await setMute(null); return void (await reply('🔔 Avvisi con suono riattivati.')) }
  if (/^\/analisi\b/.test(text)) {
    const project = text.replace(/^\/analisi\s*/, '').trim()
    if (project.length < 2) return void (await reply('Scrivi: /analisi NomeProgetto'))
    return void (await startJob('analysis', project))
  }
  if (/^\/articolo\b/.test(text)) return void (await startJob('article', text.replace(/^\/articolo(@\S+)?\s*/, '').trim()))
  if (/^\/aiuto\b/.test(text)) return void (await reply('Posso: vedere bozze, messaggi e numeri del sito; scrivere un articolo in bozza sull’argomento che scegli; proporti di pubblicare o programmare un articolo, rispondere a un messaggio, cambiare un link, creare un post su Publer (ti chiedo sempre OK con i pulsanti); mettere in coda per Claude i lavori di codice. Copertina: rispondi con una foto al messaggio della bozza. Tasti in basso: Oggi, Bozze, Messaggi, Da approvare, Coda Claude, Azioni. Comandi: /oggi /bozze /messaggi /approvare /azioni /articolo Argomento /analisi Nome /silenzio 8 /attiva /registro'))
  if (/^\/registro\b/.test(text)) return void (await reply(await taskLines(15)))
  
  tg('sendChatAction', { chat_id: chat, action: 'typing' }).catch(() => undefined)
  try { await reply(await converse(text)) } catch (e) { await reply('⚠️ Errore: ' + (e as Error).message) }
}


// --- tasti, riepiloghi e azioni rapide ---------------------------------------------------

const SECTIONS: Record<string, string> = {
  '📋 Oggi': 'oggi', '/oggi': 'oggi', '/stato': 'oggi', '📝 Bozze': 'bozze', '/bozze': 'bozze', '📨 Messaggi': 'messaggi', '/messaggi': 'messaggi',
  '/riepilogo': 'riepilogo', '/news': 'news', '⏳ Da approvare': 'approvare', '/approvare': 'approvare', '🧰 Coda Claude': 'coda', '/coda': 'coda', '⚙️ Azioni': 'azioni', '/azioni': 'azioni',
}

async function sendKeyboard(text: string) {
  const chat = await ownerChat()
  if (!chat) return
  await tg('sendMessage', {
    chat_id: chat, text,
    reply_markup: { keyboard: [[{ text: '📋 Oggi' }, { text: '📝 Bozze' }, { text: '📨 Messaggi' }], [{ text: '⏳ Da approvare' }, { text: '🧰 Coda Claude' }, { text: '⚙️ Azioni' }]], resize_keyboard: true, is_persistent: true },
  }).catch(() => undefined)
}

const admin = (p: string) => siteUrl() + '/admin/' + p
const when = (d: Date | null) => (d ? dateToRome(d).replace('T', ' ') : '')

export async function dashboard(): Promise<{ text: string; buttons: Button[][] }> {
  const [drafts, proDrafts, sched, msgs, queued, proposed, proSubs, subs, mute] = await Promise.all([
    db.post.count({ where: { status: 'DRAFT' } }), db.post.count({ where: { status: 'DRAFT', ...ANALYSIS_WHERE } }),
    db.post.findMany({ where: { status: 'DRAFT', scheduledAt: { not: null } }, orderBy: { scheduledAt: 'asc' }, take: 5, include: { translations: true } }),
    db.formSubmission.count({ where: { handled: false } }), db.agentTask.count({ where: { status: 'QUEUED' } }), db.agentTask.count({ where: { status: 'PROPOSED' } }),
    db.subscription.count({ where: { status: 'ACTIVE' } }), db.subscriber.count(), mutedUntil(),
  ])
  const lines = [
    `📋 Oggi, ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })}`,
    '',
    `⏳ Da approvare: ${proposed}`,
    `📝 Bozze: ${drafts}${proDrafts ? ` (di cui ${proDrafts} analisi PRO)` : ''}`,
    `📨 Messaggi da gestire: ${msgs}`,
    `🧰 In coda per Claude: ${queued}`,
    `💎 Abbonati PRO: ${proSubs} · ✉️ Iscritti: ${subs}`,
  ]
  if (sched.length) lines.push('', '📅 Prossime uscite programmate:', ...sched.map((p) => `• ${when(p.scheduledAt)} ${short(enTitle(p.translations), 60)}`))
  if (mute) lines.push('', `🔕 Avvisi in silenzio fino alle ${when(mute)}`)
  const needs = proposed + msgs + drafts
  if (!needs) lines.push('', '✅ Niente da decidere.')
  return {
    text: lines.join('\n'),
    buttons: [
      [{ text: `⏳ Da approvare (${proposed})`, data: 'm:approvare' }, { text: `📝 Bozze (${drafts})`, data: 'm:bozze' }],
      [{ text: `📨 Messaggi (${msgs})`, data: 'm:messaggi' }, { text: `🧰 Coda (${queued})`, data: 'm:coda' }],
      [{ text: '⚙️ Azioni', data: 'm:azioni' }, { text: '🔗 Pannello admin', url: admin('') }],
    ],
  }
}

export async function showSection(name: string) {
  if (name === 'oggi') { const d = await dashboard(); return void (await sendOwner(d.text, d.buttons)) }
  if (name === 'bozze') {
    const rows = await db.post.findMany({ where: { status: 'DRAFT' }, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 8, include: { translations: true, category: true } })
    if (!rows.length) return void (await sendOwner('📝 Nessuna bozza.'))
    for (const p of rows) await sendDraftCard(p)
    return
  }
  if (name === 'messaggi') {
    const rows = await db.formSubmission.findMany({ where: { handled: false }, orderBy: { createdAt: 'desc' }, take: 6 })
    if (!rows.length) return void (await sendOwner('📨 Nessun messaggio da gestire.'))
    for (const m of rows) {
      const p = m.payload as Record<string, unknown>
      await sendOwner(`📨 ${m.type} · ${m.email ?? ''}\n${p.name ? p.name + ': ' : ''}${short(String(p.message ?? JSON.stringify(p)), 800)}`, [[{ text: '✉️ Rispondi (bozza IA)', data: `mr:${m.id}` }, { text: '✅ Gestito', data: `mh:${m.id}` }]])
    }
    return
  }
  if (name === 'approvare') {
    const rows = await db.agentTask.findMany({ where: { status: 'PROPOSED' }, orderBy: { createdAt: 'asc' }, take: 8 })
    if (!rows.length) return void (await sendOwner('⏳ Niente in attesa di approvazione.'))
    for (const t of rows) await sendOwner(`🔔 Da approvare\n\n${t.title}\n\n${short(t.detail, 1200)}`, [[{ text: '✅ Approva', data: `a:${t.id}` }, { text: '❌ Scarta', data: `r:${t.id}` }]])
    return
  }
  if (name === 'coda') {
    const rows = await db.agentTask.findMany({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' }, take: 8 })
    if (!rows.length) return void (await sendOwner('🧰 Niente in coda per Claude.'))
    for (const t of rows) await sendOwner(`🧰 Per Claude\n\n${short(t.detail || t.title, 1500)}`, [[{ text: '✔ Segna fatta', data: `qd:${t.id}` }]])
    return void (await sendOwner('Queste richieste le riprende Claude quando apri la sessione di lavoro e scrivi "guarda la coda".'))
  }
  if (name === 'riepilogo') return void (await eveningDigest())
  if (name === 'news') return void (await dailyNews(true))
  if (name === 'azioni') {
    return void (await sendOwner('⚙️ Cosa vuoi che prepari? Tutto esce come bozza, mai pubblicato da solo.', [
      [{ text: '✍️ Articolo della settimana', data: 'go:article' }, { text: '✍️ Su un tema: /articolo Argomento', data: 'm:azioni' }],
      [{ text: '📅 Programma social settimana', data: 'go:week' }, { text: '📧 Bozza newsletter', data: 'go:digest' }],
      [{ text: '📰 Proponi la news di oggi', data: 'go:news' }, { text: '🌙 Riepilogo del giorno', data: 'm:riepilogo' }],
      [{ text: '💡 Idee per analisi PRO', data: 'go:ideas' }, { text: '🗓 Notizie → bozze per domani', data: 'go:newsdrafts' }],
      [{ text: '🔕 Silenzio 8 ore', data: 'go:mute' }, { text: '🔔 Riattiva avvisi', data: 'go:unmute' }],
      [{ text: '📊 Analisi PRO: scrivi /analisi Nome', data: 'm:oggi' }],
    ]))
  }
}

type DraftPost = { id: string; access: string; coverUrl: string | null; scheduledAt: Date | null; categoryId: string | null; category: { slug: string } | null; translations: { locale: string; title: string | null }[] }

/** Scheda di una bozza con i pulsanti. Il messaggio resta legato alla bozza: rispondendo con una foto diventa la copertina. */
async function sendDraftCard(p: DraftPost, prefix = '') {
  const line2 = [isAnalysis(p) ? '📊 Analisi PRO' : p.access === 'PRO' ? '💎 PRO' : 'articolo', p.coverUrl ? 'copertina ✅' : 'copertina ❌', p.scheduledAt ? '📅 ' + when(p.scheduledAt) : 'non programmata'].join(' · ')
  const row2: Button[] = []
  if (p.coverUrl) { row2.push({ text: '🚀 Pubblica ora', data: `pb:${p.id}` }); row2.push({ text: p.scheduledAt ? '📅 Cambia: domani 10:00' : '📅 Domani 10:00', data: `sc:${p.id}` }) }
  if (p.scheduledAt) row2.push({ text: '🚫 Togli programma', data: `us:${p.id}` })
  const hint = p.coverUrl ? '\nPer cambiare copertina rispondi a questo messaggio con una foto.' : '\nServe la copertina: rispondi a questo messaggio con una foto.'
  const mid = await sendOwner(`${prefix}📝 ${enTitle(p.translations)}\n${line2}${hint}`, [[{ text: '👁 Leggi', data: `rd:${p.id}` }, { text: '🔗 Apri in admin', url: admin('articles') }], ...(row2.length ? [row2] : [])])
  if (mid) await linkMessageToPost(mid, p.id)
}

/** Manda la scheda della bozza più recente creata dopo `since` (per i lavori automatici). */
export async function sendNewDraftCard(since: Date) {
  if (!agentToken() || !(await ownerChat())) return
  const draft = await db.post.findFirst({ where: { status: 'DRAFT', createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, include: { translations: true, category: true } })
  if (draft) await sendDraftCard(draft, '✍️ Nuova bozza pronta\n\n')
}

const coverKey = (messageId: number) => `agent:cover:${messageId}`
async function linkMessageToPost(messageId: number, postId: string) {
  await db.jobRun.upsert({ where: { key: coverKey(messageId) }, update: { note: postId }, create: { key: coverKey(messageId), note: postId } }).catch(() => undefined)
}

/** Foto ricevuta: se risponde alla scheda di una bozza diventa la sua copertina, altrimenti si chiede a quale bozza assegnarla. */
async function handleCoverPhoto(m: any) {
  const fileId: string = m.photo?.length ? m.photo[m.photo.length - 1].file_id : m.document.file_id
  const replyTo = m.reply_to_message?.message_id as number | undefined
  const linked = replyTo ? (await db.jobRun.findUnique({ where: { key: coverKey(replyTo) } }))?.note : null
  if (linked) return void (await applyCover(linked, fileId))
  const drafts = await db.post.findMany({ where: { status: 'DRAFT' }, orderBy: [{ coverUrl: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }], take: 6, include: { translations: true } })
  if (!drafts.length) return void (await sendOwner('🖼 Nessuna bozza a cui mettere la copertina.'))
  await db.jobRun.upsert({ where: { key: 'agent:pendingcover' }, update: { note: fileId }, create: { key: 'agent:pendingcover', note: fileId } })
  await sendOwner('🖼 A quale bozza metto questa copertina?', drafts.map((p) => [{ text: `${p.coverUrl ? '🔁' : '➕'} ${short(enTitle(p.translations), 50)}`, data: `cv:${p.id}` }]))
}

async function applyCover(postId: string, fileId: string) {
  const post = await postOrThrow(postId)
  const info = await tg('getFile', { file_id: fileId })
  const res = await fetch(`https://api.telegram.org/file/bot${agentToken()}/${info.file_path}`, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`download da Telegram non riuscito (${res.status})`)
  const ext = String(info.file_path).split('.').pop()?.toLowerCase() ?? ''
  const type = ({ png: 'image/png', webp: 'image/webp', gif: 'image/gif' } as Record<string, string>)[ext] ?? 'image/jpeg'
  const cover = await saveCover(post.id, new Blob([await res.arrayBuffer()], { type }), '')
  if (!cover) throw new Error('immagine vuota')
  await db.agentTask.create({ data: { kind: 'cover', title: `Copertina per "${short(enTitle(post.translations), 150)}"`, status: 'DONE', source: 'agente', result: cover } })
  await sendDraftCard({ ...post, coverUrl: cover }, '🖼 Copertina salvata\n\n')
}

async function startJob(job: string, arg = '') {
  const names: Record<string, string> = { article: arg ? `articolo su "${short(arg, 80)}"` : 'articolo della settimana', week: 'programma social della settimana', digest: 'bozza newsletter', newsdrafts: 'bozze dalle notizie', analysis: `analisi di ${arg}` }
  await sendOwner(`⏳ Avviato: ${names[job]}. Ti scrivo quando è pronto${job === 'analysis' || job === 'article' ? ' (3-5 minuti)' : ''}.`)
  const task = await db.agentTask.create({ data: { kind: 'job:' + job, title: `Preparo ${names[job]}`, status: 'RUNNING', source: 'agente' } })
  void (async () => {
    try {
      let out = ''
      if (job === 'article') out = await runWeeklyArticle(arg || undefined)
      else if (job === 'week') out = await runWeekPlan(nextMondayRome())
      else if (job === 'digest') out = 'Campagna in bozza: ' + (await runWeeklyDigest()) + ' · ' + admin('newsletter')
      else if (job === 'newsdrafts') out = `${await runDailySocial()} bozze di post create su Telegram e X (vedi ${admin('news')})`
      else if (job === 'analysis') out = `Analisi "${(await runWeeklyAnalysis(arg)).title}" in bozza (PRO, non si condivide sui social). ${admin('articles')}`
      await db.agentTask.update({ where: { id: task.id }, data: { status: 'DONE', result: out.slice(0, 500) } })
      // articolo o analisi: si manda subito la scheda della bozza, a cui rispondere con la foto della copertina
      const draft = job === 'article' || job === 'analysis'
        ? await db.post.findFirst({ where: { status: 'DRAFT', createdAt: { gte: task.createdAt } }, orderBy: { createdAt: 'desc' }, include: { translations: true, category: true } })
        : null
      if (draft) await sendDraftCard(draft, `✅ Pronto: ${names[job]}\n\n`)
      else await sendOwner(`✅ Pronto: ${names[job]}\n\n${short(out, 600)}`, [[{ text: '📝 Vedi bozze', data: 'm:bozze' }]])
    } catch (e) {
      await db.agentTask.update({ where: { id: task.id }, data: { status: 'FAILED', result: (e as Error).message.slice(0, 500) } })
      await sendOwner(`⚠️ Non riuscito: ${names[job]}\n${(e as Error).message}`)
    }
  })()
}

async function handleAction(act: string, id: string, done: (t: string) => Promise<unknown>) {
  const tool = (n: string) => TOOLS.find((t) => t.name === n)!
  try {
    if (act === 'm') { await done(''); return await showSection(id) }
    if (act === 'rd') {
      await done('')
      const p = await postOrThrow(id)
      const t = p.translations.find((x) => x.locale === 'EN') ?? p.translations[0]
      const mid = await sendOwner(`👁 ${t?.title}\n\n${t?.excerpt ?? ''}\n\n${short(t?.contentMd ?? '', 2600)}`, [[{ text: '🚀 Pubblica ora', data: `pb:${id}` }, { text: '📅 Domani 10:00', data: `sc:${id}` }]])
      if (mid) await linkMessageToPost(mid, id)
      return
    }
    if (act === 'pb') { const p = await postOrThrow(id); await done('Proposta pronta'); return void (await propose(tool('publish_article'), { id, social: !isAnalysis(p) })) }
    if (act === 'sc') { const p = await postOrThrow(id); await done('Proposta pronta'); return void (await propose(tool('schedule_article'), { id, when: dateToRome(tomorrowRome(10)), social: !isAnalysis(p) })) }
    if (act === 'us') { await done('Proposta pronta'); return void (await propose(tool('unschedule_article'), { id })) }
    if (act === 'mh') { await db.formSubmission.update({ where: { id }, data: { handled: true } }); await done('Segnato come gestito ✅'); return }
    if (act === 'mr') { await done('Preparo la bozza…'); return void (await sendOwner(await converse(`Scrivi una bozza di risposta al messaggio ${id} (leggilo con list_messages) e proponila per l'approvazione con reply_message.`))) }
    if (act === 'an') { await done('Avvio l’analisi'); return await startJob('analysis', id) }
    if (act === 'cv') {
      const fileId = (await db.jobRun.findUnique({ where: { key: 'agent:pendingcover' } }))?.note
      if (!fileId) return void (await done('Rimanda la foto'))
      await done('Salvo la copertina…')
      await db.jobRun.delete({ where: { key: 'agent:pendingcover' } }).catch(() => undefined)
      return await applyCover(id, fileId)
    }
    if (act === 'qd') { await db.agentTask.update({ where: { id }, data: { status: 'DONE', result: 'Segnata come fatta da Nicolò' } }); await done('Segnata come fatta ✅'); return }
    if (act === 'go') {
      if (id === 'mute') { await setMute(8); return void (await done('🔕 Silenzio per 8 ore')) }
      if (id === 'unmute') { await setMute(null); return void (await done('🔔 Avvisi riattivati')) }
      if (id === 'news') { await done('Cerco la news…'); return await dailyNews(true) }
      if (id === 'ideas') { await done('Cerco idee…'); return await analysisIdeas() }
      await done('Avviato')
      return await startJob(id)
    }
    await done('Azione sconosciuta')
  } catch (e) { await done('Errore'); await sendOwner('⚠️ ' + (e as Error).message) }
}

// --- messaggi programmati ------------------------------------------------------------------

function romeNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]))
  const hour = Number(p.hour) % 24
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday)
  return { date: `${p.year}-${p.month}-${p.day}`, mins: hour * 60 + Number(p.minute), wd }
}
const at = (h: number, m = 0) => h * 60 + m

async function claim(name: string, date: string): Promise<boolean> {
  try { await db.jobRun.create({ data: { key: `agent:${name}-${date}` } }); return true } catch { return false }
}

/** Notizia del giorno: la prepara e la propone con Approva (pubblica ORA su Publer), Altra notizia, Scarta. */
export async function dailyNews(manual = false) {
  if (manual) await sendOwner('⏳ Cerco la notizia più utile di oggi…')
  try {
    const recent = await db.socialPost.findMany({ where: { linkUrl: { not: null } }, orderBy: { createdAt: 'desc' }, take: 150, select: { linkUrl: true } })
    const proposed = await db.agentTask.findMany({ where: { kind: 'publish_news', createdAt: { gte: new Date(Date.now() - 3 * 86400000) } }, select: { args: true } })
    const links = [...recent.map((r) => r.linkUrl ?? ''), ...proposed.flatMap((t) => ((t.args as any)?.posts ?? []).map((x: any) => x.link ?? ''))]
    const posts = await proposeNewsPost(links)
    await propose(TOOLS.find((t) => t.name === 'publish_news')!, { posts }, [{ text: '🔄 Altra notizia', data: 'go:news' }])
  } catch (e) {
    await sendOwner(`⚠️ Non sono riuscito a preparare la news: ${(e as Error).message}. Riprova con /news.`)
  }
}

async function analysisIdeas() {
  try {
    const ideas = await suggestAnalysisIdeas()
    await sendOwner('💡 Tre progetti per l’analisi PRO di questa settimana:\n\n' + ideas.map((i, n) => `${n + 1}. ${i.name}: ${i.reason}`).join('\n'),
      ideas.map((i) => [{ text: `📊 Analizza ${i.name}`.slice(0, 60), data: `an:${i.name}`.slice(0, 60) }]))
  } catch (e) { await sendOwner('⚠️ Non ho trovato idee: ' + (e as Error).message) }
}

/** Riepilogo serale: cosa è successo oggi sul sito e cosa aspetta una decisione. */
export async function eveningDigest() {
  const { date } = romeNow()
  const since = romeToDate(`${date}T00:00`)
  const prev = new Date(since.getTime() - 86400000)
  const [views, viewsPrev, clicks, users, subs, pro, forms, published, social, done, failed, proposed, oldDrafts, msgs, topRaw] = await Promise.all([
    db.event.count({ where: { kind: 'PAGE_VIEW', createdAt: { gte: since } } }),
    db.event.count({ where: { kind: 'PAGE_VIEW', createdAt: { gte: prev, lt: since } } }),
    db.event.count({ where: { kind: 'AFFILIATE_CLICK', createdAt: { gte: since } } }),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.subscriber.count({ where: { createdAt: { gte: since } } }),
    db.subscription.count({ where: { createdAt: { gte: since }, status: 'ACTIVE' } }),
    db.formSubmission.count({ where: { createdAt: { gte: since } } }),
    db.post.findMany({ where: { status: 'PUBLISHED', publishedAt: { gte: since } }, include: { translations: true } }),
    db.socialPost.count({ where: { sentAt: { gte: since } } }),
    db.agentTask.count({ where: { status: 'DONE', updatedAt: { gte: since }, source: { not: 'sistema' } } }),
    db.agentTask.count({ where: { status: 'FAILED', updatedAt: { gte: since } } }),
    db.agentTask.count({ where: { status: 'PROPOSED' } }),
    db.post.count({ where: { status: 'DRAFT', createdAt: { lt: new Date(Date.now() - 2 * 86400000) } } }),
    db.formSubmission.count({ where: { handled: false } }),
    db.event.groupBy({ by: ['toolId'], where: { kind: 'AFFILIATE_CLICK', createdAt: { gte: since }, toolId: { not: null } }, _count: { toolId: true }, orderBy: { _count: { toolId: 'desc' } }, take: 3 }),
  ])
  const topTools = topRaw.length ? await db.tool.findMany({ where: { id: { in: topRaw.map((t) => t.toolId as string) } }, select: { id: true, title: true } }) : []
  const arrow = viewsPrev ? (views >= viewsPrev ? `▲ ${Math.round(((views - viewsPrev) / viewsPrev) * 100)}%` : `▼ ${Math.round(((viewsPrev - views) / viewsPrev) * 100)}%`) + ' su ieri' : ''
  const L = [`🌙 Cosa è successo oggi sul sito`, '', `👁 Visite: ${views} ${arrow}`.trim(), `🔗 Click su link di affiliazione: ${clicks}`]
  for (const t of topRaw) L.push(`   • ${topTools.find((x) => x.id === t.toolId)?.title ?? '?'}: ${t._count.toolId}`)
  L.push(`👤 Nuovi utenti: ${users} · ✉️ Nuovi iscritti newsletter: ${subs} · 💎 Nuovi PRO: ${pro}`)
  L.push(`📨 Moduli ricevuti: ${forms}`)
  if (published.length) L.push(`📰 Articoli pubblicati: ${published.map((p) => short(enTitle(p.translations), 50)).join(' · ')}`)
  L.push(`📣 Post social inviati: ${social}`)
  if (done || failed) L.push(`🤖 Azioni dell’agente: ${done} fatte${failed ? `, ${failed} non riuscite ⚠️` : ''}`)
  const todo = [proposed && `${proposed} proposte da approvare`, msgs && `${msgs} messaggi da gestire`, oldDrafts && `${oldDrafts} bozze ferme da più di 2 giorni`].filter(Boolean)
  L.push('', todo.length ? '⏳ In sospeso: ' + todo.join(', ') : '✅ Niente in sospeso.')
  await sendOwner(L.join('\n'), todo.length ? [[{ text: `⏳ Da approvare (${proposed})`, data: 'm:approvare' }, { text: `📨 Messaggi (${msgs})`, data: 'm:messaggi' }]] : undefined, Boolean(await mutedUntil()))
}

/** Promemoria: analisi PRO (martedì), articolo normale e programmazione dei social della settimana dopo. */
async function reminders(date: string, wd: number) {
  const silent = Boolean(await mutedUntil())
  const monday = romeToDate(`${new Date(new Date(`${date}T00:00:00Z`).getTime() - wd * 86400000).toISOString().slice(0, 10)}T00:00`)
  // analisi PRO (moneta/progetto): una a settimana, esce solo il martedì (sul blog, non sui social)
  const drafts = await db.post.count({ where: { status: 'DRAFT', ...ANALYSIS_WHERE } })
  const doneWeek = await db.post.count({ where: { status: 'PUBLISHED', ...ANALYSIS_WHERE, publishedAt: { gte: monday } } })
  const needIdea: Button[][] = [[{ text: '💡 Suggeriscimi 3 progetti', data: 'go:ideas' }], [{ text: '✍️ Scrivi: /analisi NomeProgetto', data: 'm:azioni' }]]
  if (wd === 4 && !drafts) await sendOwner('📊 Promemoria: martedì esce l’analisi PRO (una moneta o un progetto) e non c’è ancora la bozza. Conviene prepararla nel weekend: servono 3-5 minuti.', needIdea, silent)
  else if (wd === 0 && !drafts) await sendOwner('📊 Promemoria: domani, martedì, esce l’analisi PRO e non c’è ancora la bozza. Preparala oggi.', needIdea, silent)
  else if (wd === 0 && drafts) await sendOwner('📊 Promemoria: domani esce l’analisi PRO. La bozza c’è: rileggi i dati (prezzi, supply, date) prima di pubblicarla.', [[{ text: '📝 Vedi bozze', data: 'm:bozze' }]], silent)
  else if (wd === 1 && drafts) await sendOwner('📊 Oggi è martedì: esce l’analisi PRO. Pubblicala dalla bozza (va sul blog, non sui social).', [[{ text: '📝 Vedi bozze', data: 'm:bozze' }]], silent)
  else if (wd === 1 && !drafts && !doneWeek) await sendOwner('📊 Oggi è martedì ma l’analisi PRO non è pronta. Se la scrivi ora esce oggi, altrimenti martedì prossimo.', needIdea, silent)
  // articoli normali (tutorial, news, guide): almeno uno a settimana in bozza, programmato o pubblicato
  if ([1, 3].includes(wd)) {
    const normal = await db.post.count({ where: { NOT: ANALYSIS_WHERE, OR: [{ createdAt: { gte: monday } }, { publishedAt: { gte: monday } }, { scheduledAt: { gte: monday } }] } })
    if (!normal) await sendOwner('✍️ Promemoria: questa settimana non c’è ancora nessun articolo normale (un tutorial, un confronto o una guida sugli strumenti), né in bozza né programmato.', [[{ text: '✍️ Prepara l’articolo della settimana', data: 'go:article' }]], silent)
  }
  // programmazione social della settimana prossima
  if ([3, 4, 6].includes(wd)) {
    const nm = romeToDate(`${nextMondayRome()}T00:00`)
    const n = await db.socialPost.count({ where: { scheduledAt: { gte: nm, lt: new Date(nm.getTime() + 7 * 86400000) } } })
    if (n < 7) await sendOwner(`📅 Promemoria: la programmazione social della settimana prossima ha solo ${n} post preparati (ne servono almeno 7, uno al giorno).`, [[{ text: '📅 Prepara il programma', data: 'go:week' }], [{ text: '🔗 Social in admin', url: admin('news') }]], silent)
  }
}

/** Ogni 5 minuti: manda i messaggi programmati (ora di Roma). Ogni messaggio parte una sola volta al giorno. */
export async function agentTick() {
  if (!agentToken() || !(await ownerChat())) return
  const { date, mins, wd } = romeNow()
  if (mins >= at(8, 30) && mins < at(12) && (await claim('brief', date))) {
    const d = await dashboard()
    await sendOwner('☀️ Buongiorno\n\n' + d.text.replace(/^📋 Oggi, /, '📋 '), d.buttons, Boolean(await mutedUntil()))
  }
  if (mins >= at(9, 30) && mins < at(13) && (await claim('reminders', date))) await reminders(date, wd).catch((e) => console.error('[agent] promemoria: ' + e.message))
  if (mins >= at(11) && mins < at(14) && (await claim('news', date))) await dailyNews()
  if (mins >= at(20, 30) && mins < at(23, 30) && (await claim('evening', date))) await eveningDigest().catch((e) => console.error('[agent] riepilogo: ' + e.message))
}
