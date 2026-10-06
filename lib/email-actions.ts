'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from './db'
import { requireAdmin } from './admin'
import { sendEmail } from './email'
import { flowByKey } from './email-flows'

/** Accende o spegne una email automatica. */
export async function toggleFlow(fd: FormData) {
  await requireAdmin()
  const key = String(fd.get('key'))
  if (!flowByKey(key)) return
  const enabled = String(fd.get('enabled')) === '1'
  await db.emailFlow.upsert({ where: { key }, update: { enabled }, create: { key, enabled } })
  revalidatePath('/admin/emails')
  redirect('/admin/emails')
}

/** Manda una copia di prova (con dati di esempio) all'indirizzo scritto. */
export async function sendTestEmail(fd: FormData) {
  await requireAdmin()
  const key = String(fd.get('key'))
  const to = String(fd.get('to') ?? '').trim()
  const flow = flowByKey(key)
  const back = (m: string): never => redirect(`/admin/emails/${key}?msg=${encodeURIComponent(m)}`)
  if (!flow) return redirect('/admin/emails')
  if (!/^\S+@\S+\.\S+$/.test(to)) return back('Scrivi un indirizzo email valido')
  const mail = await flow.build()
  const ok = await sendEmail({ to, subject: `[TEST] ${mail.subject}`, html: mail.html }).catch(() => false)
  return back(ok ? `Email di prova inviata a ${to}` : 'Invio non riuscito. Controlla RESEND_API_KEY, EMAIL_FROM e che il dominio sia verificato su Resend.')
}
