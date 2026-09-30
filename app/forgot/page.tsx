import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Forgot your password', robots: { index: false } }

export default async function Forgot({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams
  return (
    <div className="container">
      <div className="auth-card">
        <h1>Forgot your password?</h1>
        <p className="auth-sub">Enter your email and we will send you a link to choose a new one.</p>
        {sent && <div className="auth-ok">If this email has an account, a link is on its way.</div>}
        <form method="post" action="/api/auth/forgot" className="auth-form">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <button className="btn btn-blue" type="submit">
            Send the link
          </button>
        </form>
      </div>
    </div>
  )
}
