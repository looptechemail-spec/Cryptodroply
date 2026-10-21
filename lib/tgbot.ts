/** Bot Telegram dell'agente (diverso dal bot che pubblica sul canale). Variabile Railway: TELEGRAM_AGENT_TOKEN. */
import { createHash } from 'node:crypto'
import { db } from './db'

export const agentToken = () => process.env.TELEGRAM_AGENT_TOKEN ?? ''
/** Codice segreto per l'indirizzo del webhook, ricavato dal token (nessuna variabile in più). */
export const webhookSecret = () => createHash('sha256').update('wh:' + agentToken()).digest('hex').slice(0, 32)

export async function tg(method: string, body: Record<string, unknown>): Promise<any> {
  const token = agentToken()
  if (!token) throw new Error('TELEGRAM_AGENT_TOKEN mancante')
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) throw new Error(`Telegram ${method}: ${json?.description ?? res.status}`)
  return json.result
}

/** Chat del proprietario: si lega con "/start <password admin>" oppure si imposta TELEGRAM_OWNER_ID. */
export async function ownerChat(): Promise<string | null> {
  if (process.env.TELEGRAM_OWNER_ID) return process.env.TELEGRAM_OWNER_ID
  return (await db.jobRun.findUnique({ where: { key: 'agent:owner' } }))?.note ?? null
}

export type Button = { text: string; data?: string; url?: string }

/** Avvisi in silenzio (arrivano senza suono) fino a una certa ora. */
export async function mutedUntil(): Promise<Date | null> {
  const r = await db.jobRun.findUnique({ where: { key: 'agent:mute' } })
  const d = r?.note ? new Date(r.note) : null
  return d && d.getTime() > Date.now() ? d : null
}
export async function setMute(hours: number | null) {
  if (!hours) return void (await db.jobRun.delete({ where: { key: 'agent:mute' } }).catch(() => undefined))
  const note = new Date(Date.now() + hours * 3600000).toISOString()
  await db.jobRun.upsert({ where: { key: 'agent:mute' }, update: { note }, create: { key: 'agent:mute', note } })
}

export async function sendOwner(text: string, buttons?: Button[][], silent = false): Promise<number | null> {
  if (!agentToken()) return null
  const chat = await ownerChat()
  if (!chat) return null
  const body = (t: string, md: boolean) => ({
    chat_id: chat, text: t.slice(0, 3900), disable_web_page_preview: true, ...(silent ? { disable_notification: true } : {}),
    ...(buttons ? { reply_markup: { inline_keyboard: buttons.map((r) => r.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data }))) } } : {}),
  })
  try { return (await tg('sendMessage', body(text, false))).message_id as number } catch (e) { console.error('[telegram-agent] ' + (e as Error).message); return null }
}

export async function registerWebhook(siteUrl: string, log: (m: string) => void = () => {}) {
  if (!agentToken()) return
  try {
    await tg('setWebhook', { url: `${siteUrl}/api/telegram/${webhookSecret()}`, secret_token: webhookSecret(), allowed_updates: ['message', 'callback_query'] })
    await tg('setMyCommands', { commands: [{ command: 'oggi', description: 'Riepilogo di oggi' }, { command: 'riepilogo', description: 'Cosa è successo oggi sul sito' }, { command: 'news', description: 'Proponi la news di oggi' }, { command: 'bozze', description: 'Bozze da gestire' }, { command: 'articolo', description: 'Scrivi un articolo: /articolo argomento' },{ command: 'messaggi', description: 'Messaggi dal sito' }, { command: 'approvare', description: 'Proposte in attesa' }, { command: 'azioni', description: 'Genera articoli, programma, newsletter' }, { command: 'registro', description: 'Ultime attività' }, { command: 'silenzio', description: 'Avvisi senza suono (ore)' }, { command: 'menu', description: 'Mostra i tasti' }] })
    log('webhook registrato')
  } catch (e) { log('errore ' + (e as Error).message) }
}

/** Avviso al proprietario + traccia nel registro, così l'agente sa cosa gli è stato segnalato. */
export async function alertOwner(text: string, buttons?: Button[][]): Promise<boolean> {
  if (!agentToken() || !(await ownerChat())) return false
  const id = await sendOwner(text, buttons, Boolean(await mutedUntil()))
  await db.agentTask.create({ data: { kind: 'avviso', title: text.slice(0, 240), status: 'INFO', source: 'sistema', chatMessage: id } }).catch(() => undefined)
  return id !== null
}
