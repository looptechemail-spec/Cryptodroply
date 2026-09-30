/**
 * Accesso ai contenuti PRO.
 * TODO (fase "membri e abbonamento"): leggere la sessione dell'utente e
 * controllare che abbia un abbonamento Stripe attivo (tabella Subscription).
 * Finché non c'è il login, nessuno è PRO e i contenuti PRO risultano bloccati.
 */
export async function hasPro(): Promise<boolean> {
  return false
}

export const PRO_PRICE_LABEL = '€14 per month'
