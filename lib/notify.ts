/**
 * Avvisi su WhatsApp tramite CallMeBot (gratuito, solo per il tuo numero).
 * Variabili su Railway: CALLMEBOT_PHONE (es. +393331234567) e CALLMEBOT_APIKEY.
 * Non lancia mai errori: un avviso fallito non deve bloccare il sito.
 */
import { db } from './db'
import { siteUrl } from './email'
import { alertOwner, agentToken } from './tgbot'

export const waReady = () => Boolean(process.env.CALLMEBOT_PHONE && process.env.CALLMEBOT_APIKEY)
export const notifyReady = () => waReady() || Boolean(agentToken())

let chain: Promise<unknown> = Promise.resolve()

async function sendNow(text: string): Promise<string> {
  const phone = process.env.CALLMEBOT_PHONE
  const apikey = process.env.CALLMEBOT_APIKEY
  if (!phone || !apikey) return 'ok' // WhatsApp non configurato: resta Telegram
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone.trim())}&text=${encodeURIComponent(text.slice(0, 1000))}&apikey=${encodeURIComponent(apikey.trim())}`
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    const body = (await res.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
    return res.ok ? 'ok' : `errore ${res.status}: ${body}`
  } catch (e) {
    return `errore: ${(e as Error).message}`
  }
}

/** Invia un avviso. Con `key` lo stesso avviso parte una volta sola (evita doppioni). Messaggi uno alla volta, a distanza di 3 secondi. */
export async function notify(text: string, key?: string): Promise<string> {
  if (!notifyReady()) return 'non configurato'
  try {
    if (key) await db.jobRun.create({ data: { key: `notified:${key}`.slice(0, 190), note: text.slice(0, 120) } })
  } catch { return 'già inviato' }
  const p = chain.then(async () => {
    let r = await sendNow(text)
    if (agentToken()) { const t = await alertOwner(text).catch(() => false); if (!t && r === 'ok' && !waReady()) r = 'Telegram: chat non collegata' }
    if (r !== 'ok') {
      console.error('[whatsapp] ' + r)
      if (key) await db.jobRun.delete({ where: { key: `notified:${key}`.slice(0, 190) } }).catch(() => undefined)
    }
    await new Promise((res) => setTimeout(res, 3000))
    return r
  })
  chain = p.catch(() => undefined)
  return p
}

/** Come notify ma non aspetta e non solleva errori. */
export function notifyBg(text: string, key?: string) {
  void notify(text, key).catch(() => undefined)
}

export const adminLink = (p: string) => siteUrl() + p
