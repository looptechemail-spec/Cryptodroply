'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from './db'
import { requireAdmin } from './admin'
import { romeToDate } from './time'
import { sendToPubler } from './publer'
import { parseCsv } from './csv'
import { nextMondayRome, runNewsDrafts, runWeekPlan, runDailySocial } from './ai-content'

const PAGES = ['/admin/tool-posts', '/admin/news']
const refresh = () => PAGES.forEach((p) => revalidatePath(p))
const back = (page: string, msg: string): never => redirect(`${page}?msg=${encodeURIComponent(msg.slice(0, 300))}`)
const pageOf = (source: string) => (source === 'tool' ? '/admin/tool-posts' : '/admin/news')
const log = (key: string, note: string) => db.jobRun.create({ data: { key: `manual-${key}-${Date.now()}`, note: note.slice(0, 400) } })

/** Un contenuto = un blocco con i testi per X, Telegram e Facebook. Un solo pulsante lo salva, lo scarta, lo pubblica subito o lo programma su tutti. */
export async function saveGroup(act: string, fd: FormData) {
  await requireAdmin()
  const ids = String(fd.get('ids') ?? '').split(',').filter(Boolean)
  const when = String(fd.get('scheduledAt') ?? '')
  const rows = await db.socialPost.findMany({ where: { id: { in: ids } } })
  if (!rows.length) back('/admin/news', 'Post non trovato: ricarica la pagina')
  const source = rows[0].source
  const page = pageOf(source)
  let msg = ''
  try {
    if (act === 'discard') {
      await db.socialPost.updateMany({ where: { id: { in: ids } }, data: { status: 'REJECTED' } })
      msg = `Scartato (${rows.length} post)`
    } else {
      let scheduledAt: Date | null = null
      if (when) scheduledAt = romeToDate(when)
      for (const r of rows) {
        const text = String(fd.get(`text_${r.id}`) ?? r.text)
        await db.socialPost.update({ where: { id: r.id }, data: { text, scheduledAt } })
      }
      if (act === 'save') msg = 'Salvato'
      else {
        const state = act === 'publish-now' ? 'now' : act === 'schedule' ? 'scheduled' : 'draft'
        if (state === 'scheduled' && !scheduledAt) throw new Error('Scegli data e ora per programmare')
        const fresh = await db.socialPost.findMany({ where: { id: { in: ids } } })
        const ok: string[] = [], bad: string[] = []
        for (const p of fresh) {
          try {
            const job = await sendToPubler(p, state)
            await db.socialPost.update({ where: { id: p.id }, data: { status: 'PUBLER', publerRef: `${state}:${job}`, sentAt: new Date() } })
            ok.push(p.channel)
          } catch (e) {
            await db.socialPost.update({ where: { id: p.id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
            bad.push(`${p.channel}: ${(e as Error).message.slice(0, 120)}`)
          }
        }
        const what = state === 'now' ? 'Pubblicato ora' : state === 'scheduled' ? 'Programmato' : 'Bozza inviata'
        msg = `${ok.length ? `${what} su ${ok.join(', ')}` : 'Nessun post inviato'}${bad.length ? `. ERRORE: ${bad.join(' | ')}` : ''}`
      }
    }
  } catch (e) {
    msg = `ERRORE: ${(e as Error).message}`
  }
  refresh()
  back(page, msg)
}

/** Manda a Publer tutti i post da rivedere di una sezione che hanno una data. */
export async function sendAll(stateArg: string, fd: FormData) {
  await requireAdmin()
  const source = String(fd.get('source'))
  const state = stateArg === 'scheduled' ? 'scheduled' : 'draft'
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
  back(pageOf(source), `${ok} inviati a Publer${bad ? `, ${bad} non riusciti (guarda le righe rosse)` : ''}${!list.length ? ': non c’era niente da inviare' : ''}`)
}

/** Carica un CSV nel formato di Publer: per ogni riga crea le bozze per X, Telegram e Facebook. */
export async function importCsv(fd: FormData) {
  await requireAdmin()
  const f = fd.get('file')
  if (!(f && typeof f === 'object' && 'arrayBuffer' in f) || !(f as File).size) back('/admin/tool-posts', 'Scegli prima un file CSV')
  const rows = parseCsv(await (f as File).text())
  const head = rows.shift() ?? []
  const iDate = head.indexOf('Date'), iText = head.indexOf('Text'), iLink = head.indexOf('Link(s)')
  if (iDate < 0 || iText < 0) back('/admin/tool-posts', 'Nel file mancano le colonne Date e Text')
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
  back('/admin/tool-posts', `${made} bozze create dal CSV`)
}

/** Prepara la settimana dei post sugli strumenti (bozze direttamente su Publer). */
export async function prepareWeek(fd: FormData) {
  await requireAdmin()
  const m = String(fd.get('monday') ?? '').trim()
  let msg = ''
  try { msg = await runWeekPlan(/^\d{4}-\d{2}-\d{2}$/.test(m) ? m : nextMondayRome()); await log('week', msg) } catch (e) { msg = `ERRORE: ${(e as Error).message}`; await log('week', msg) }
  refresh()
  back('/admin/tool-posts', msg)
}

/** Cerca le notizie del giorno e scrive le bozze. */
export async function findNews() {
  await requireAdmin()
  let msg = ''
  try { msg = `${await runDailySocial()} bozze dalle news`; await log('news', msg) } catch (e) { msg = `ERRORE: ${(e as Error).message}`; await log('news', msg) }
  refresh()
  back('/admin/news', msg)
}

/** Testo o indirizzo incollato -> bozze; con mode 'now' le pubblica subito su X, Telegram e Facebook, con 'schedule' le programma alla data scelta. */
export async function newsFromText(mode: string, fd: FormData) {
  await requireAdmin()
  let msg = ''
  try {
    const when = String(fd.get('when') ?? '')
    if (mode === 'schedule' && !when) throw new Error('Scegli data e ora per programmare')
    const ids = await runNewsDrafts(String(fd.get('content') ?? ''), when || undefined)
    if (mode === 'draft') msg = `${ids.length} bozze create`
    else {
      const state = mode === 'now' ? 'now' : 'scheduled'
      const rows = await db.socialPost.findMany({ where: { id: { in: ids } } })
      const ok: string[] = [], bad: string[] = []
      for (const p of rows) {
        try {
          const job = await sendToPubler(p, state)
          await db.socialPost.update({ where: { id: p.id }, data: { status: 'PUBLER', publerRef: `${state}:${job}`, sentAt: new Date() } })
          ok.push(p.channel)
        } catch (e) {
          await db.socialPost.update({ where: { id: p.id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
          bad.push(`${p.channel}: ${(e as Error).message.slice(0, 120)}`)
        }
      }
      msg = `${ok.length ? `${state === 'now' ? 'Pubblicato ora' : 'Programmato'} su ${ok.join(', ')}` : 'Nessun post inviato'}${bad.length ? `. ERRORE: ${bad.join(' | ')} (i testi restano nelle bozze)` : ''}`
    }
    await log('news', msg)
  } catch (e) { msg = `ERRORE: ${(e as Error).message}`; await log('news', msg) }
  refresh()
  back('/admin/news', msg)
}

/** Cancella tutte le bozze (e gli scartati) di una sezione. I post già mandati a Publer non si toccano. */
export async function deleteAllDrafts(source: string) {
  await requireAdmin()
  const r = await db.socialPost.deleteMany({ where: { source, status: { in: ['DRAFT', 'REJECTED'] } } })
  refresh()
  back(pageOf(source), `Eliminate ${r.count} bozze`)
}
