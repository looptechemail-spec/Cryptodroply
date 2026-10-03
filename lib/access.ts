import { cookies } from 'next/headers'
import { getUser, isAdmin } from './auth'
import { SECTIONS } from './sections'
import { db } from './db'

export const PRO_PRICE_LABEL = '€14 per month'
export const PRO_PRICE_LABEL_IT = '14 € al mese'

/**
 * Chi può vedere i contenuti PRO: gli abbonati con abbonamento attivo, gli utenti admin
 * e chi è collegato al pannello admin (per controllare il sito come lo vede un abbonato).
 */
export async function hasPro(): Promise<boolean> {
  try {
    if ((await cookies()).get('cd_preview')?.value === 'visitor') return false // admin che guarda come visitatore
    if (await isAdmin()) return true
    const user = await getUser()
    if (!user) return false
    if (user.role === 'ADMIN') return true
    const sub = user.subscription
    if (!sub || !(sub.status === 'ACTIVE' || sub.status === 'TRIALING' || (sub.status === 'CANCELED' && !!sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()))) {
      // clienti del vecchio sito: PRO regalato all'indirizzo email (pagano ancora su Wix)
      return !!(await db.proGrant.findUnique({ where: { email: user.email.toLowerCase() }, select: { id: true } }))
    }
    if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') return true
    // periodo già pagato che scade a fine mese anche se l'abbonamento è stato annullato
    return sub.status === 'CANCELED' && !!sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
  } catch {
    return false
  }
}

/** Collezioni (Category.wixId) delle sezioni PRO: Grow e Privacy. Si vedono solo con PRO. */
export const PRO_COLLECTIONS: string[] = SECTIONS.filter((s) => s.pro).flatMap((s) => s.collections)
export const isProCollection = (wixId?: string | null) => !!wixId && PRO_COLLECTIONS.includes(wixId)
