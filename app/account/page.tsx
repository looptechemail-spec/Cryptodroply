import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getUser } from '@/lib/auth'
import { hasPro, PRO_PRICE_LABEL } from '@/lib/access'
import { stripeReady } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Your account', robots: { index: false } }

export default async function Account({ searchParams }: { searchParams: Promise<{ checkout?: string; welcome?: string; error?: string }> }) {
  const user = await getUser()
  if (!user) redirect('/login')
  const { checkout, welcome, error } = await searchParams
  const pro = await hasPro()
  const sub = user.subscription
  const fmt = (d: Date | null | undefined) => d?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="container">
      <div className="page-head">
        <h1>Your account</h1>
        <p style={{ color: 'var(--muted)' }}>{user.email}</p>
      </div>
      {welcome && <div className="auth-ok">Thank you. Your PRO access is being activated and appears here within a minute.</div>}
      {error === 'stripe' && <div className="auth-error">Payments are not available yet. Please try again soon.</div>}
      <div className="account-grid">
        <div className="plan">
          <div className="plan-name">
            Plan {pro && <span className="badge-pro pro-on-dark">PRO</span>}
          </div>
          <p style={{ fontSize: 18 }}>
            {pro
              ? sub?.cancelAtPeriodEnd
                ? `PRO is active until ${fmt(sub.currentPeriodEnd)} and will not renew.`
                : sub?.currentPeriodEnd
                  ? `PRO is active. Next payment on ${fmt(sub.currentPeriodEnd)}.`
                  : 'PRO is active.'
              : `You are on the free plan. PRO is ${PRO_PRICE_LABEL}: Grow and Privacy sections, video tutorials and full analyses.`}
          </p>
          {!pro && (
            <form method="post" action="/api/stripe/checkout">
              <button className="btn btn-blue" type="submit" disabled={!stripeReady()}>
                {checkout ? 'Continue to payment' : 'Get PRO'}
              </button>
              {!stripeReady() && <p style={{ fontSize: 14, color: 'var(--muted)' }}>Payments are being set up.</p>}
            </form>
          )}
          {user.stripeCustomerId && (
            <form method="post" action="/api/stripe/portal">
              <button className="btn btn-outline-dark" type="submit">
                Manage billing and invoices
              </button>
            </form>
          )}
        </div>
        <div className="plan">
          <div className="plan-name">Account</div>
          <form method="post" action="/api/auth/logout">
            <button className="btn btn-outline-dark" type="submit">
              Log out
            </button>
          </form>
          <p style={{ fontSize: 15, color: 'var(--muted)' }}>
            Need help? <Link href="/contact">Contact us</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
