import Link from 'next/link'
import type { Metadata } from 'next'
import { readToken } from '@/lib/auth'

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } }

export default async function Reset({ searchParams }: { searchParams: Promise<{ t?: string; error?: string }> }) {
  const { t, error } = await searchParams
  const valid = !!readToken(t)?.uid
  return (
    <div className="container">
      <div className="auth-card">
        <h1>Choose a new password</h1>
        {(!valid || error === 'expired') && (
          <div className="auth-error">
            This link is not valid or has expired. <Link href="/forgot">Ask for a new one</Link>.
          </div>
        )}
        {error === '1' && valid && <div className="auth-error">Use a password of at least 8 characters.</div>}
        {valid && error !== 'expired' && (
          <form method="post" action="/api/auth/reset" className="auth-form">
            <input type="hidden" name="t" value={t} />
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            <button className="btn btn-blue" type="submit">
              Save password
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
