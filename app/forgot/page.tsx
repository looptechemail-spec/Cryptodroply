import type { Metadata } from 'next'
import { i18n } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return { title: t('Forgot your password', 'Password dimenticata'), robots: { index: false } }
}

export default async function Forgot({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams
  const { t } = await i18n()
  return (
    <div className="container">
      <div className="auth-card">
        <h1>{t('Forgot your password?', 'Hai dimenticato la password?')}</h1>
        <p className="auth-sub">{t('Enter your email and we will send you a link to choose a new one.', 'Inserisci la tua email e ti invieremo un link per sceglierne una nuova.')}</p>
        {sent && <div className="auth-ok">{t('If this email has an account, a link is on its way.', 'Se questa email ha un account, il link sta arrivando.')}</div>}
        <form method="post" action="/api/auth/forgot" className="auth-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <button className="btn btn-blue" type="submit">
            {t('Send the link', 'Invia il link')}
          </button>
        </form>
      </div>
    </div>
  )
}
