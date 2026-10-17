'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from './db'
import { requireAdmin } from './admin'
import { romeToDate, nextWeekdayRome } from './time'
import { publishNow, scheduleArticle, unscheduleArticle } from './articles'
import { sendCampaign } from './newsletter'
import { decideTask, isAnalysis } from './agent'

const PAGE = '/admin/approvazioni'
const done = (msg: string): never => {
  revalidatePath(PAGE); revalidatePath('/admin'); revalidatePath('/admin/articles'); revalidatePath('/admin/newsletter'); revalidatePath('/admin/agente')
  redirect(`${PAGE}?msg=${encodeURIComponent(msg.slice(0, 300))}`)
}

/** Articolo: pubblica ora, programma (le analisi PRO di default al martedì alle 10, mai sui social) o toglie la programmazione. */
export async function articleDecide(act: string, fd: FormData) {
  await requireAdmin()
  const id = String(fd.get('id') ?? '')
  let msg = ''
  try {
    const post = await db.post.findUnique({ where: { id }, include: { category: { select: { slug: true } } } })
    if (!post) throw new Error('Articolo non trovato')
    const social = !isAnalysis(post) && fd.get('social') === 'on'
    if (act === 'publish') msg = await publishNow(id, social)
    else if (act === 'schedule') {
      const w = String(fd.get('when') ?? '')
      const when = w ? romeToDate(w) : isAnalysis(post) ? nextWeekdayRome(1, 10) : null
      if (!when) throw new Error('Scegli data e ora')
      msg = await scheduleArticle(id, when, social)
    } else if (act === 'unschedule') { await unscheduleArticle(id); msg = 'Programmazione tolta' }
  } catch (e) { msg = `ERRORE: ${(e as Error).message}` }
  done(msg)
}

export async function campaignSendNow(fd: FormData) {
  await requireAdmin()
  let msg = ''
  try {
    const r = await sendCampaign(String(fd.get('id') ?? ''))
    msg = r ? `Newsletter inviata a ${r.sent} di ${r.total}` : 'Già inviata'
  } catch (e) { msg = `ERRORE: ${(e as Error).message}` }
  done(msg)
}

export async function taskDecide(approve: boolean, fd: FormData) {
  await requireAdmin()
  let msg = ''
  try { msg = (await decideTask(String(fd.get('id') ?? ''), approve)).text } catch (e) { msg = `ERRORE: ${(e as Error).message}` }
  done(msg)
}
