import { db } from './db'

/** Pubblica su Telegram i post APPROVATI il cui orario è arrivato. Serve TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID (variabili Railway). */
export async function publishDueTelegram(log: (m: string) => void = () => {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chat = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat) return
  const due = await db.socialPost.findMany({
    where: { channel: 'telegram', status: 'APPROVED', OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
    orderBy: { scheduledAt: 'asc' }, take: 5,
  })
  for (const p of due) {
    // si segna prima, così un doppio giro non lo pubblica due volte
    const claimed = await db.socialPost.updateMany({ where: { id: p.id, status: 'APPROVED' }, data: { status: 'SENT', sentAt: new Date() } })
    if (!claimed.count) continue
    const text = p.linkUrl && !p.text.includes(p.linkUrl) ? `${p.text}\n\n${p.linkUrl}` : p.text
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: false }),
    }).catch(() => null)
    if (res?.ok) log(`Telegram: pubblicato ${p.id}`)
    else {
      await db.socialPost.update({ where: { id: p.id }, data: { status: 'APPROVED', sentAt: null } }) // riprova al prossimo giro
      log(`Telegram: errore ${res?.status ?? 'rete'} su ${p.id}`)
    }
  }
}
