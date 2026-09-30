import Link from 'next/link'
import type { Metadata } from 'next'
import { PRO_PRICE_LABEL } from '@/lib/access'

export const metadata: Metadata = { title: 'Create your account', robots: { index: false } }

const ERRORS: Record<string, string> = {
  invalid: 'Check your email and use a password of at least 8 characters.',
  exists: 'An account with this email already exists. Log in instead.',
}

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string; plan?: string }> }) {
  const { error, plan } = await searchParams
  return (
    <div className="container">
      <div className="auth-card">
        <h1>{plan === 'pro' ? 'Create your account to get PRO' : 'Create your free account'}</h1>
        <p className="auth-sub">
          {plan === 'pro' ? `Next you will pay securely with Stripe, ${PRO_PRICE_LABEL}. Cancel any time.` : 'It takes a minute and needs no card.'}
        </p>
        {error && <div className="auth-error">{ERRORS[error] ?? 'Something went wrong. Try again.'}</div>}
        <form method="post" action="/api/auth/signup" className="auth-form">
          {plan && <input type="hidden" name="plan" value={plan} />}
          <label htmlFor="name">Name (optional)</label>
          <input id="name" name="name" autoComplete="name" />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          <button className="btn btn-blue" type="submit">
            Create account
          </button>
        </form>
        <p className="auth-foot">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
