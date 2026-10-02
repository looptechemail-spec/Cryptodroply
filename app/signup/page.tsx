import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import type { Metadata } from 'next'
import { PRO_PRICE_LABEL } from '@/lib/access'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return { title: t('Create your account', 'Crea il tuo account'), robots: { index: false } }
}


export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string; plan?: string }> }) {
  const { error, plan } = await searchParams
  const { t } = await i18n()
  const ERRORS: Record<string, string> = {
    invalid: t('Check your email and use a password of at least 8 characters.', 'Controlla l\'email e usa una password di almeno 8 caratteri.'),
    exists: t('An account with this email already exists. Log in instead.', 'Esiste già un account con questa email. Accedi.'),
  }
  return (
    <div className="container">
      <div className="auth-card">
        <h1>{plan === 'pro' ? t('Create your account to get PRO', 'Crea il tuo account per avere PRO') : t('Create your free account', 'Crea il tuo account gratuito')}</h1>
        <p className="auth-sub">
          {plan === 'pro'
            ? t(`Next you will pay securely with Stripe, ${PRO_PRICE_LABEL}. Cancel any time.`, `Poi pagherai in modo sicuro con Stripe, ${PRO_PRICE_LABEL}. Disdici quando vuoi.`)
            : t('It takes a minute and needs no card.', 'Ci vuole un minuto e non serve la carta.')}
        </p>
        {error && <div className="auth-error">{ERRORS[error] ?? t('Something went wrong. Try again.', 'Qualcosa è andato storto. Riprova.')}</div>}
        <form method="post" action="/api/auth/signup" className="auth-form">
          {plan && <input type="hidden" name="plan" value={plan} />}
          <label htmlFor="name">{t('Name (optional)', 'Nome (facoltativo)')}</label>
          <input id="name" name="name" autoComplete="name" />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          <button className="btn btn-blue" type="submit">
            {t('Create account', 'Crea account')}
          </button>
        </form>
        <p className="auth-foot">
          {t('Already have an account?', 'Hai già un account?')} <Link href="/login">{t('Log in', 'Accedi')}</Link>
        </p>
      </div>
    </div>
  )
}
