import { getUser, isAdmin } from './auth'

export const PRO_PRICE_LABEL = '€14 per month'

/**
 * Chi può vedere i contenuti PRO: gli abbonati con abbonamento attivo, gli utenti admin
 * e chi è collegato al pannello admin (per controllare il sito come lo vede un abbonato).
 */
export async function hasPro(): Promise<boolean> {
  try {
    if (await isAdmin()) return true
    const user = await getUser()
    if (!user) return false
    if (user.role === 'ADMIN') return true
    const sub = user.subscription
    if (!sub) return false
    if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') return true
    // periodo già pagato che scade a fine mese anche se l'abbonamento è stato annullato
    return sub.status === 'CANCELED' && !!sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
  } catch {
    return false
  }
}
