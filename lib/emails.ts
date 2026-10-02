/** Email automatiche del sito: registrazione, acquisto, rinnovo, pagamento fallito, disdetta. Ognuna ha il suo interruttore in admin > Emails. */
import { sendFlow } from './email-gate'
import * as T from './email-templates'

export const welcomeEmail = (to: string, name?: string | null, uid?: string) =>
  sendFlow('onboarding-1', { to, ...T.tplWelcome(name, uid) }).catch(() => false)

export const purchaseEmail = (to: string, name: string | null | undefined, amountCents: number, currency: string, nextDate?: Date | null) =>
  sendFlow('pro-purchase', { to, ...T.tplPurchase(name, amountCents, currency, nextDate) }).catch(() => false)

export const renewalEmail = (to: string, name: string | null | undefined, amountCents: number, currency: string, nextDate?: Date | null) =>
  sendFlow('pro-renewal', { to, ...T.tplRenewal(name, amountCents, currency, nextDate) }).catch(() => false)

export const paymentFailedEmail = (to: string, name?: string | null) =>
  sendFlow('pro-payment-failed', { to, ...T.tplPaymentFailed(name) }).catch(() => false)

export const canceledEmail = (to: string, name: string | null | undefined, endsAt?: Date | null) =>
  sendFlow('pro-canceled', { to, ...T.tplCanceled(name, endsAt) }).catch(() => false)
