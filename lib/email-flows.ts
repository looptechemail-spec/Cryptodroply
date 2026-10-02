/** Elenco di tutte le email automatiche del sito, con testo di esempio per l'anteprima in admin. */
import { siteUrl } from './email'
import { wrap } from './newsletter'
import { welcome as nlWelcome, usecase as nlUsecase, pro as nlPro } from './sequence'
import { referralHtml } from './referral-mail'
import * as T from './email-templates'

export type Flow = {
  key: string
  group: 'Registration' | 'PRO plan' | 'Newsletter' | 'System'
  name: string
  when: string
  to: string
  build: () => Promise<T.Mail> | T.Mail
}

const next = () => new Date(Date.now() + 30 * 86400000)
const NAME = 'Alex'

export const FLOWS: Flow[] = [
  { key: 'onboarding-1', group: 'Registration', name: 'Welcome 1 of 3', when: 'Right after someone creates an account. Button: Get PRO.', to: 'The new user', build: () => T.tplWelcome(NAME) },
  { key: 'onboarding-2', group: 'Registration', name: 'Welcome 2 of 3: what PRO unlocks', when: '2 days after sign up, only if not PRO yet. Button: Start PRO.', to: 'The user', build: () => T.tplOnboarding2(NAME) },
  { key: 'onboarding-3', group: 'Registration', name: 'Welcome 3 of 3: last nudge', when: '5 days after sign up, only if not PRO yet. Button: Get PRO.', to: 'The user', build: () => T.tplOnboarding3(NAME) },
  { key: 'pro-purchase', group: 'PRO plan', name: 'PRO activated', when: 'First payment received on Stripe.', to: 'The subscriber', build: () => T.tplPurchase(NAME, 1400, 'eur', next()) },
  { key: 'pro-renewal', group: 'PRO plan', name: 'PRO renewed', when: 'Every monthly renewal payment.', to: 'The subscriber', build: () => T.tplRenewal(NAME, 1400, 'eur', next()) },
  { key: 'pro-payment-failed', group: 'PRO plan', name: 'Payment failed', when: 'Stripe could not charge the card.', to: 'The subscriber', build: () => T.tplPaymentFailed(NAME) },
  { key: 'pro-canceled', group: 'PRO plan', name: 'PRO canceled', when: 'The subscriber cancels the renewal.', to: 'The subscriber', build: () => T.tplCanceled(NAME, next()) },
  { key: 'referral-monthly', group: 'PRO plan', name: 'Monthly referral summary', when: 'First day of each month, 10:00 Rome time.', to: 'Every active PRO member', build: () => ({ subject: 'Your Cryptodroply referral summary', html: referralHtml({ name: NAME, url: `${siteUrl()}/r/example`, referrals: 3, lastMonth: 840, pending: 420, available: 1260, paid: 2520 }) }) },
  { key: 'newsletter-confirm', group: 'Newsletter', name: 'Confirm your subscription', when: 'Someone signs up to the newsletter (double opt-in). Without it they are not subscribed.', to: 'The new subscriber', build: () => T.tplConfirm(`${siteUrl()}/api/newsletter/confirm?t=example`) },
  { key: 'newsletter-welcome', group: 'Newsletter', name: 'Newsletter 1 of 3: welcome', when: 'When the subscription is confirmed.', to: 'The subscriber', build: async () => { const c = await nlWelcome(); return { subject: c.subject, html: wrap(c.html, 'preview') } } },
  { key: 'newsletter-usecase', group: 'Newsletter', name: 'Newsletter 2 of 3: choose a wallet', when: '2 days after confirmation.', to: 'The subscriber', build: async () => { const c = await nlUsecase(); return { subject: c.subject, html: wrap(c.html, 'preview') } } },
  { key: 'newsletter-pro', group: 'Newsletter', name: 'Newsletter 3 of 3: what PRO gives', when: '5 days after confirmation. Button: See PRO.', to: 'The subscriber', build: async () => { const c = await nlPro(); return { subject: c.subject, html: wrap(c.html, 'preview') } } },
  { key: 'password-reset', group: 'System', name: 'Reset password', when: 'Someone asks to reset the password. Turning it off blocks password resets.', to: 'The user', build: () => T.tplReset(`${siteUrl()}/reset?t=example`) },
  { key: 'contact-notify', group: 'System', name: 'New contact message', when: 'Someone sends the contact form. The message is always saved in Messages.', to: 'You (info@)', build: () => T.tplContact({ topic: 'contact', name: 'Alex Rossi', email: 'alex@example.com', message: 'Hi, I would like to list my project on Cryptodroply.\nCan you tell me how?' }) },
]

export const flowByKey = (k: string) => FLOWS.find((f) => f.key === k)
