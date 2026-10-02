'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from './db'
import { requireAdmin } from './admin'
import { romeToDate } from './time'
import { sendToPubler } from './publer'
import { parseCsv } from './csv'
import { nextMondayRome, runNewsFromText, runWeekPlan, runDailySocial } from './ai-content'

const PAGES = ['/admin/tool-posts', '/admin/news']
const refresh = () => PAGES.forEach((p) => revalidatePath(p))
const back = (page: string, msg: string): never => redirect(`${page}?msg=${encodeURIComponent(msg.slice(0, 300))}`)
const pageOf = (source: string) => (source === 'tool' ? '/admin/tool-posts' : '/admin/news')
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
  let msg = act === 'reject' ? 'Post discarded' : 'Saved'
  if (act === 'publer-draft' || act === 'publer-schedule') {
    const state = act === 'publer-draft' ? 'draft' : 'scheduled'
    try {
      const job = await sendToPubler(p, state)
      await db.socialPost.update({ where: { id }, data: { status: 'PUBLER', publerRef: `${state}:${job}`, sentAt: new Date() } })
      msg = state === 'draft' ? 'Sent to Publer as a draft' : 'Scheduled on Publer'
    } catch (e) {
      await db.socialPost.update({ where: { id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
      msg = `Publer error: ${(e as Error).message}`
    }
  }
  refresh()
  back(pageOf(p.source), msg)
}

/** Manda a Publer tutti i post da rivedere di una sezione che hanno una data. */
export async function sendAll(fd: FormData) {
  await requireAdmin()
  const source = String(fd.get('source'))
  const state = String(fd.get('state')) === 'scheduled' ? 'scheduled' : 'draft'
  let ok = 0, bad = 0
  const list = await db.socialPost.findMany({
    where: { source, status: 'DRAFT', channel: { in: ['x', 'telegram', 'facebook'] }, ...(state === 'scheduled' ? { scheduledAt: { not: null } } : {}) },
    orderBy: { scheduledAt: 'asc' }, take: 60,
  })
  for (const p of list) {
    try {
      const job = await sendToPubler(p, state)
      await db.socialPost.update({ where: { id: p.id }, data: { status: 'PUBLER', publerRef: `${state}:${job}`, sentAt: new Date() } })
      ok++
    } catch (e) {
      await db.socialPost.update({ where: { id: p.id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
      bad++
    }
  }
  refresh()
  back(pageOf(source), `${ok} sent to Publer${bad ? `, ${bad} failed (see the red lines)` : ''}${!list.length ? ': nothing to send' : ''}`)
}

/** Carica un CSV nel formato di Publer: per ogni riga crea le bozze per X, Telegram e Facebook. */
export async function importCsv(fd: FormData) {
  await requireAdmin()
  const f = fd.get('file')
  if (!(f instanceof File) || !f.size) back('/admin/tool-posts', 'Choose a CSV file first')
  const rows = parseCsv(await (f as File).text())
  const head = rows.shift() ?? []
  const iDate = head.indexOf('Date'), iText = head.indexOf('Text'), iLink = head.indexOf('Link(s)')
  if (iDate < 0 || iText < 0) back('/admin/tool-posts', 'The file has no Date and Text columns')
  let made = 0
  for (const r of rows) {
    const when = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r[iDate] ?? '') ? romeToDate(r[iDate].replace(' ', 'T')) : null
    const text = (r[iText] ?? '').trim()
    if (!text) continue
    for (const channel of ['x', 'telegram', 'facebook']) {
      // senza la riga con l'@ su Telegram e Facebook
      const t = channel === 'x' ? text : text.replace(/\n@\w+\n/, '\n')
      await db.socialPost.create({ data: { channel, text: t, linkUrl: iLink >= 0 && r[iLink] ? r[iLink] : null, scheduledAt: when, source: 'tool' } })
      made++
    }
  }
  refresh()
  back('/admin/tool-posts', `${made} drafts created from the CSV`)
}

/** Prepara la settimana dei post sugli strumenti (bozze direttamente su Publer). */
export async function prepareWeek(fd: FormData) {
  await requireAdmin()
  const m = String(fd.get('monday') ?? '').trim()
  let msg = ''
  try { msg = await runWeekPlan(/^\d{4}-\d{2}-\d{2}$/.test(m) ? m : nextMondayRome()); await log('week', msg) } catch (e) { msg = `ERROR: ${(e as Error).message}`; await log('week', msg) }
  refresh()
  back('/admin/tool-posts', msg)
}

/** Cerca le notizie del giorno e scrive le bozze. */
export async function findNews() {
  await requireAdmin()
  let msg = ''
  try { msg = `${await runDailySocial()} drafts from the news`; await log('news', msg) } catch (e) { msg = `ERROR: ${(e as Error).message}`; await log('news', msg) }
  refresh()
  back('/admin/news', msg)
}

/** Testo o indirizzo incollato -> bozze. */
export async function newsFromText(fd: FormData) {
  await requireAdmin()
  let msg = ''
  try { msg = await runNewsFromText(String(fd.get('content') ?? ''), String(fd.get('when') ?? '') || undefined); await log('news', msg) } catch (e) { msg = `ERROR: ${(e as Error).message}`; await log('news', msg) }
  refresh()
  back('/admin/news', msg)
}
