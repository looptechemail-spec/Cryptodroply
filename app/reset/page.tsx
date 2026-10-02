import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import type { Metadata } from 'next'
import { readToken } from '@/lib/auth'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return { title: t('Choose a new password', 'Scegli una nuova password'), robots: { index: false } }
}

export default async function Reset({ searchParams }: { searchParams: Promise<{ t?: string; error?: string }> }) {
  const { t: token, error } = await searchParams
  const { t } = await i18n()
  const valid = !!readToken(token)?.uid
  return (
    <div className="container">
      <div className="auth-card">
        <h1>{t('Choose a new password', 'Scegli una nuova password')}</h1>
        {(!valid || error === 'expired') && (
          <div className="auth-error">
            {t('This link is not valid or has expired.', 'Questo link non è valido o è scaduto.')} <Link href="/forgot">{t('Ask for a new one', 'Richiedine uno nuovo')}</Link>.
          </div>
        )}
        {error === '1' && valid && <div className="auth-error">{t('Use a password of at least 8 characters.', 'Usa una password di almeno 8 caratteri.')}</div>}
        {valid && error !== 'expired' && (
          <form method="post" action="/api/auth/reset" className="auth-form">
            <input type="hidden" name="t" value={token} />
            <label htmlFor="password">{t('New password', 'Nuova password')}</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            <button className="btn btn-blue" type="submit">
              {t('Save password', 'Salva password')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
