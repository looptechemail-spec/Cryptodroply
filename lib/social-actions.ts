'use server'
import { revalidatePath } from 'next/cache'
import { db } from './db'
import { requireAdmin } from './admin'
import { romeToDate } from './time'
import { sendToPubler } from './publer'
import { parseCsv } from './csv'
import { nextMondayRome, runNewsFromText, runWeekPlan, runDailySocial } from './ai-content'

const PAGES = ['/admin/tool-posts', '/admin/news']
const refresh = () => PAGES.forEach((p) => revalidatePath(p))
const log = (key: string, note: string) => db.jobRun.create({ data: { key: `manual-${key}-${Date.now()}`, note: note.slice(0, 400) } })

/** Salva un post e, se serve, lo manda a Publer come bozza o programmato. */
export async function savePost(fd: FormData) {
  await requireAdmin()
  const id = String(fd.get('id'))
  const when = String(fd.get('scheduledAt') ?? '')
  const act = String(fd.get('act'))
  const p = await db.socialPost.update({
    where: { id },
    data: { text: String(fd.get('text')), scheduledAt: when ? romeToDate(when) : null, ...(act === 'reject' ? { status: 'REJECTED' } : {}) },
  })
  if (act === 'publer-draft' || act === 'publer-schedule') {
    const state = act === 'publer-draft' ? 'draft' : 'scheduled'
    try {
      const job = await sendToPubler(p, state)
      await db.socialPost.update({ where: { id }, data: { status: 'PUBLER', publerRef: `${state}:${job}`, sentAt: new Date() } })
    } catch (e) {
      await db.socialPost.update({ where: { id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
    }
  }
  refresh()
}

/** Manda a Publer tutti i post da rivedere di una sezione che hanno una data. */
export async function sendAll(fd: FormData) {
  await requireAdmin()
  const source = String(fd.get('source'))
  const state = String(fd.get('state')) === 'scheduled' ? 'scheduled' : 'draft'
  const list = await db.socialPost.findMany({
    where: { source, status: 'DRAFT', channel: { in: ['x', 'telegram', 'facebook'] }, ...(state === 'scheduled' ? { scheduledAt: { not: null } } : {}) },
    orderBy: { scheduledAt: 'asc' }, take: 60,
  })
  for (const p of list) {
    try {
      const job = await sendToPubler(p, state)
      await db.socialPost.update({ where: { id: p.id }, data: { status: 'PUBLER', publerRef: `${state}:${job}`, sentAt: new Date() } })
    } catch (e) {
      await db.socialPost.update({ where: { id: p.id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
    }
  }
  refresh()
}

/** Carica un CSV nel formato di Publer: per ogni riga crea le bozze per X, Telegram e Facebook. */
export async function importCsv(fd: FormData) {
  await requireAdmin()
  const f = fd.get('file')
  if (!(f instanceof File) || !f.size) return
  const rows = parseCsv(await f.text())
  const head = rows.shift() ?? []
  const iDate = head.indexOf('Date'), iText = head.indexOf('Text'), iLink = head.indexOf('Link(s)')
  if (iDate < 0 || iText < 0) { await log('csv', 'ERROR: il file non ha le colonne Date e Text'); refresh(); return }
  for (const r of rows) {
    const when = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r[iDate] ?? '') ? romeToDate(r[iDate].replace(' ', 'T')) : null
    const text = (r[iText] ?? '').trim()
    if (!text) continue
    for (const channel of ['x', 'telegram', 'facebook']) {
      // senza la riga con l'@ su Telegram e Facebook
      const t = channel === 'x' ? text : text.replace(/\n@\w+\n/, '\n')
      await db.socialPost.create({ data: { channel, text: t, linkUrl: iLink >= 0 && r[iLink] ? r[iLink] : null, scheduledAt: when, source: 'tool' } })
    }
  }
  refresh()
}

/** Prepara la settimana dei post sugli strumenti (bozze direttamente su Publer). */
export async function prepareWeek(fd: FormData) {
  await requireAdmin()
  const m = String(fd.get('monday') ?? '').trim()
  try { await log('week', await runWeekPlan(/^\d{4}-\d{2}-\d{2}$/.test(m) ? m : nextMondayRome())) } catch (e) { await log('week', `ERROR: ${(e as Error).message}`) }
  refresh()
}

/** Cerca le notizie del giorno e scrive le bozze. */
export async function findNews() {
  await requireAdmin()
  try { await log('news', `${await runDailySocial()} bozze da notizie`) } catch (e) { await log('news', `ERROR: ${(e as Error).message}`) }
  refresh()
}

/** Testo o indirizzo incollato -> bozze. */
export async function newsFromText(fd: FormData) {
  await requireAdmin()
  try { await log('news', await runNewsFromText(String(fd.get('content') ?? ''), String(fd.get('when') ?? '') || undefined)) } catch (e) { await log('news', `ERROR: ${(e as Error).message}`) }
  refresh()
}
