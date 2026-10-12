/**
 * Agente Telegram di Cryptodroply: capisce i messaggi di Nicolò (Claude via API), legge lo stato del sito,
 * prepara le azioni e le esegue solo dopo il suo OK (pulsanti Approva / Scarta). Tutto passa dal registro AgentTask,
 * che condivide con Claude (sessioni di lavoro sul codice) e con gli avvisi del sistema.
 */
import { db } from './db'
import { siteUrl, sendEmail } from './email'
import { publishNow, scheduleArticle } from './articles'
import { sendToPubler } from './publer'
import { romeToDate, dateToRome } from './time'
import { tg, sendOwner, ownerChat, agentToken, type Button } from './tgbot'

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
    name: 'publish_article', mode: 'approve', description: 'Pubblica subito una bozza (EN + IT). social=true crea anche i post social (le analisi PRO non vengono mai condivise).',
    schema: { properties: { id: { type: 'string' }, social: { type: 'boolean' } }, required: ['id'] },
    prepare: async (a) => {
      const p = await postOrThrow(a.id)
      if (p.status !== 'DRAFT') throw new Error('Non è una bozza')
      if (!p.coverUrl) throw new Error('Manca la copertina: va aggiunta prima (dal pannello Articoli)')
      return { title: `Pubblicare "${enTitle(p.translations)}"`, detail: `${p.access === 'PRO' ? 'Articolo PRO (nessun post social).' : a.social ? 'Con post social su Publer tra 15 minuti.' : 'Senza post social.'}` }
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
      return { title: `Programmare "${enTitle(p.translations)}" per il ${String(a.when).replace('T', ' alle ')}`, detail: a.social && p.access !== 'PRO' ? 'Con post social alla stessa ora.' : 'Senza post social.' }
    },
    run: async (a) => scheduleArticle(String(a.id), romeToDate(String(a.when)), !!a.social),
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

async function propose(tool: Tool, args: any): Promise<string> {
  let p: { title: string; detail: string }
  try { p = await tool.prepare!(args) } catch (e) { return `Non posso proporlo: ${(e as Error).message}` }
  const task = await db.agentTask.create({ data: { kind: tool.name, title: p.title, detail: p.detail, args, status: 'PROPOSED', source: 'agente' } })
  const id = await sendOwner(`🔔 Da approvare\n\n${p.title}\n\n${short(p.detail, 1500)}`, [[{ text: '✅ Approva', data: `a:${task.id}` }, { text: '❌ Scarta', data: `r:${task.id}` }]])
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
  const [act, id] = String(cb.data ?? '').split(':')
  const done = (text: string) => tg('answerCallbackQuery', { callback_query_id: cb.id, text: text.slice(0, 190) }).catch(() => undefined)
  const edit = (text: string) => tg('editMessageText', { chat_id: chat, message_id: cb.message.message_id, text: text.slice(0, 3900), reply_markup: { inline_keyboard: [] } }).catch(() => undefined)
  const task = await db.agentTask.findUnique({ where: { id } })
  if (!task) return void (await done('Attività non trovata'))
  const claim = await db.agentTask.updateMany({ where: { id, status: 'PROPOSED' }, data: { status: act === 'a' ? 'RUNNING' : 'REJECTED', result: act === 'a' ? null : 'Scartata da Nicolò' } })
  if (!claim.count) return void (await done('Già gestita'))
  if (act !== 'a') { await done('Scartata'); return void (await edit(`❌ Scartata\n\n${task.title}`)) }
  await done('Eseguo…')
  const tool = TOOLS.find((t) => t.name === task.kind)
  try {
    if (!tool) throw new Error('azione sconosciuta')
    const out = await tool.run(task.args)
    await db.agentTask.update({ where: { id }, data: { status: 'DONE', result: out.slice(0, 500) } })
    await edit(`✅ Fatto\n\n${task.title}\n\n${short(out, 800)}`)
  } catch (e) {
    await db.agentTask.update({ where: { id }, data: { status: 'FAILED', result: (e as Error).message.slice(0, 500) } })
    await edit(`⚠️ Non riuscito\n\n${task.title}\n\n${(e as Error).message}`)
  }
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
- Le analisi PRO settimanali non si condividono mai sui social. Non si pubblica senza copertina.
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
  const text: string = (m?.text ?? '').trim()
  if (!m || !text) return
  const chat = String(m.chat.id)
  const reply = (t: string, b?: Button[][]) => tg('sendMessage', { chat_id: chat, text: t.slice(0, 3900), disable_web_page_preview: true, ...(b ? { reply_markup: { inline_keyboard: b.map((r) => r.map((x) => (x.url ? { text: x.text, url: x.url } : { text: x.text, callback_data: x.data })) ) } } : {}) })
  const owner = await ownerChat()

  if (/^\/start\b/.test(text)) {
    const pass = text.replace(/^\/start\s*/, '').trim()
    if (owner) return void (await reply(owner === chat ? 'Ci sono. Scrivimi cosa serve, oppure /stato.' : 'Questo bot è privato.'))
    const expected = (process.env.ADMIN_PASSWORD ?? '').trim()
    if (expected && pass === expected) {
      await db.jobRun.upsert({ where: { key: 'agent:owner' }, update: { note: chat }, create: { key: 'agent:owner', note: chat } })
      return void (await reply('Collegato. Da ora ti scrivo qui per ciò che richiede la tua decisione e puoi darmi comandi. Prova /stato.'))
    }
    return void (await reply('Per collegarti scrivi: /start seguito dalla password dell’admin.'))
  }
  if (!owner || chat !== owner) return // chiunque altro viene ignorato

  if (/^\/aiuto\b/.test(text)) return void (await reply('Posso: vedere bozze, messaggi e numeri del sito; proporti di pubblicare o programmare un articolo, rispondere a un messaggio, cambiare un link, creare un post su Publer (ti chiedo sempre OK con i pulsanti); mettere in coda per Claude i lavori di codice. Comandi: /stato /registro'))
  if (/^\/registro\b/.test(text)) return void (await reply(await taskLines(15)))
  if (/^\/stato\b/.test(text)) return void (await reply(await stateBlock()))

  tg('sendChatAction', { chat_id: chat, action: 'typing' }).catch(() => undefined)
  try { await reply(await converse(text)) } catch (e) { await reply('⚠️ Errore: ' + (e as Error).message) }
}
