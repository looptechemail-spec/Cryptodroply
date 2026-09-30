import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Log in', robots: { index: false } }

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const { error, reset } = await searchParams
  return (
    <div className="container">
      <div className="auth-card">
        <h1>Log in</h1>
        {error && <div className="auth-error">Wrong email or password.</div>}
        {reset && <div className="auth-ok">Password updated. You can log in now.</div>}
        <form method="post" action="/api/auth/login" className="auth-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
          <button className="btn btn-blue" type="submit">
            Log in
          </button>
        </form>
        <p className="auth-foot">
          <Link href="/forgot">Forgot your password?</Link>
          <br />
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
