import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return { title: t('Log in', 'Accedi'), robots: { index: false } }
}

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const { error, reset } = await searchParams
  const { t } = await i18n()
  return (
    <div className="container">
      <div className="auth-card">
        <h1>{t('Log in', 'Accedi')}</h1>
        {error && <div className="auth-error">{t('Wrong email or password.', 'Email o password errata.')}</div>}
        {reset && <div className="auth-ok">{t('Password updated. You can log in now.', 'Password aggiornata. Ora puoi accedere.')}</div>}
        <form method="post" action="/api/auth/login" className="auth-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password">{t('Password', 'Password')}</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
          <button className="btn btn-blue" type="submit">
            {t('Log in', 'Accedi')}
          </button>
        </form>
        <p className="auth-foot">
          <Link href="/forgot">{t('Forgot your password?', 'Hai dimenticato la password?')}</Link>
          <br />
          {t('New here?', 'Sei nuovo?')} <Link href="/signup">{t('Create an account', 'Crea un account')}</Link>
        </p>
      </div>
    </div>
  )
}
