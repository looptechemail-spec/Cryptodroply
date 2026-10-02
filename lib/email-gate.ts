/** Interruttore delle email automatiche: se in admin una email è spenta, non parte. Senza riga nel database è attiva. */
import { db } from './db'
import { sendEmail } from './email'

export async function flowEnabled(key: string): Promise<boolean> {
  try {
    const f = await db.emailFlow.findUnique({ where: { key } })
    return f ? f.enabled : true
  } catch {
    return true
  }
}

export async function sendFlow(key: string, mail: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!(await flowEnabled(key))) return false
  return sendEmail(mail)
}
