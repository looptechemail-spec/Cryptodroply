import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { hasPro, PRO_PRICE_LABEL } from '@/lib/access'
import { stripeReady } from '@/lib/stripe'
import { AppCard } from '@/components/AppCard'
import { pick } from '@/lib/content'
import { headers } from 'next/headers'
import { CopyLink } from '@/components/CopyLink'
import { COMMISSION_RATE, HOLD_DAYS, MIN_PAYOUT_CENTS, RECURRING, earnings, ensureReferralCode, euro } from '@/lib/referral'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Your account', robots: { index: false } }

type SP = { checkout?: string; welcome?: string; error?: string; saved?: string }

export default async function Account({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getUser()
  if (!user) redirect('/login')
  const { checkout, welcome, error, saved } = await searchParams
  const pro = await hasPro()
  const sub = user.subscription
  const fmt = (d: Date | null | undefined) => d?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const [favs, subscriber] = await Promise.all([
    db.favorite.findMany({
      where: { userId: user.id, tool: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      include: { tool: { include: { translations: true, category: { include: { translations: true } } } } },
    }),
    db.subscriber.findUnique({ where: { email: user.email.toLowerCase() } }),
  ])
  const code = await ensureReferralCode(user.id, user.referralCode)
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'cryptodroply.com'
  const refLink = `https://${host}/r/${code}`
  const [earn, signups, payingReferrals] = await Promise.all([
    earnings(user.id),
    db.user.count({ where: { referredById: user.id } }),
    db.user.count({ where: { referredById: user.id, subscription: { status: { in: ['ACTIVE', 'TRIALING'] } } } }),
  ])
  const newsletterOn = !!subscriber && !subscriber.unsubscribedAt && !!subscriber.confirmedAt

  return (
    <div className="container">
      <div className="page-head">
        <h1>{user.name ? `Hi, ${user.name}` : 'Your account'}</h1>
        <p style={{ color: 'var(--muted)' }}>{user.email}</p>
      </div>
      {welcome && <div className="auth-ok">Thank you. Your PRO access is being activated and appears here within a minute.</div>}
      {saved && <div className="auth-ok">Saved.</div>}
      {error === 'stripe' && <div className="auth-error">Payments are not available yet. Please try again soon.</div>}
      {error === 'password' && <div className="auth-error">The current password is not correct.</div>}
      {error === 'short' && <div className="auth-error">The new password must have at least 8 characters.</div>}

      <div className="dash">
        <aside className="dash-side">
          <div className={`dash-card ${pro ? 'dash-pro' : ''}`}>
            <h2>
              {pro ? 'PRO' : 'Free plan'} {pro && <span className="badge-pro pro-on-dark">Active</span>}
            </h2>
            <p>
              {pro
                ? sub?.cancelAtPeriodEnd
                  ? `PRO stays active until ${fmt(sub.currentPeriodEnd)} and will not renew.`
                  : sub?.currentPeriodEnd
                    ? `Next payment on ${fmt(sub.currentPeriodEnd)}.`
                    : 'All sections are open to you.'
                : `PRO is ${PRO_PRICE_LABEL}: Grow and Privacy sections and full analyses.`}
            </p>
            {!pro && (
              <form method="post" action="/api/stripe/checkout">
                <button className="btn btn-blue" type="submit" disabled={!stripeReady()}>
                  {checkout ? 'Continue to payment' : 'Get PRO'}
                </button>
                {!stripeReady() && <p className="dash-stat">Payments are being set up.</p>}
              </form>
            )}
            {user.stripeCustomerId && (
              <form method="post" action="/api/stripe/portal" style={{ marginTop: 12 }}>
                <button className={`btn ${pro ? 'btn-yellow' : 'btn-outline-dark'}`} type="submit">
                  Billing and invoices
                </button>
              </form>
            )}
          </div>
          <div className="dash-card">
            <nav className="dash-nav">
              <a href="#saved">Saved tools</a>
              <a href="#earn">Earn 30%</a>
              {pro && <Link href="/analyses">Analyses</Link>}
              {pro && <Link href="/s/grow">Grow</Link>}
              {pro && <Link href="/s/privacy">Privacy</Link>}
              <a href="#profile">Profile</a>
              <a href="#password">Password</a>
              <a href="#newsletter">Newsletter</a>
              <Link href="/contact">Help</Link>
            </nav>
            <form method="post" action="/api/auth/logout" style={{ marginTop: 14 }}>
              <button className="btn btn-outline-dark" type="submit">
                Log out
              </button>
            </form>
          </div>
        </aside>

        <div className="dash-main">
          <section className="dash-card" id="saved">
            <h2>Saved tools</h2>
            {favs.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>
                Nothing saved yet. Press Save on a tool page and it appears here. <Link href="/s/wallet">Browse the store</Link>.
              </p>
            ) : (
              <div className="fav-grid">
                {favs.map((f) => {
                  const t = pick(f.tool.translations)
                  return (
                    <AppCard
                      key={f.toolId}
                      tool={{
                        id: f.tool.id, slug: f.tool.slug, title: f.tool.title, logoUrl: f.tool.logoUrl, coverUrl: f.tool.coverUrl,
                        description: t?.description ?? null, categorySlug: f.tool.category.slug,
                        categoryName: pick(f.tool.category.translations)?.name ?? f.tool.category.slug,
                      }}
                    />
                  )
                })}
              </div>
            )}
          </section>

          <section className="dash-card" id="earn">
            <h2>Earn {COMMISSION_RATE * 100}% on every PRO you bring</h2>
            <p style={{ color: 'var(--muted)' }}>
              Share your personal link. When someone signs up through it and subscribes to PRO, you earn {COMMISSION_RATE * 100}% of what they pay
              ({euro(1400 * COMMISSION_RATE)} on each €14 payment{RECURRING ? ', every month they stay' : ', on the first payment'}).
            </p>
            <CopyLink value={refLink} />
            <div className="earn-grid">
              <div className="earn-box"><b>{signups}</b><span>sign-ups</span></div>
              <div className="earn-box"><b>{payingReferrals}</b><span>active PRO</span></div>
              <div className="earn-box"><b>{euro(earn.pending)}</b><span>in {HOLD_DAYS}-day hold</span></div>
              <div className="earn-box"><b>{euro(earn.available)}</b><span>ready to be paid</span></div>
              <div className="earn-box"><b>{euro(earn.paid)}</b><span>already paid</span></div>
            </div>
            <p className="dash-stat">
              Commissions become payable {HOLD_DAYS} days after each payment, if it is not refunded. Payouts are made once you reach {euro(MIN_PAYOUT_CENTS)}.
              Using your own link for yourself does not count. <Link href="/affiliate">Programme details</Link>
            </p>
            <form method="post" action="/api/account/payout" className="row-form" style={{ marginTop: 14 }}>
              <label>
                Where to pay you (PayPal email or USDT address)
                <input name="payoutInfo" defaultValue={user.payoutInfo ?? ''} maxLength={200} style={{ minWidth: 320 }} />
              </label>
              <button className="btn btn-outline-dark" type="submit">Save</button>
            </form>
            {earn.rows.length > 0 && (
              <table className="admin-table" style={{ marginTop: 18 }}>
                <thead><tr><th>Date</th><th>Commission</th><th>Status</th></tr></thead>
                <tbody>
                  {earn.rows.slice(0, 10).map((c) => (
                    <tr key={c.id}>
                      <td>{c.createdAt.toISOString().slice(0, 10)}</td>
                      <td>{euro(c.amountCents)}</td>
                      <td>{c.status === 'PAID' ? 'Paid' : c.status === 'VOID' ? 'Refunded' : 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="dash-card" id="profile">
            <h2>Profile</h2>
            <form method="post" action="/api/account/profile" className="row-form">
              <label>
                Your name
                <input name="name" defaultValue={user.name ?? ''} maxLength={80} />
              </label>
              <button className="btn btn-blue" type="submit">
                Save
              </button>
            </form>
          </section>

          <section className="dash-card" id="password">
            <h2>Change password</h2>
            <form method="post" action="/api/account/password" className="row-form">
              <label>
                Current password
                <input name="current" type="password" required autoComplete="current-password" />
              </label>
              <label>
                New password (8+ characters)
                <input name="next" type="password" required minLength={8} autoComplete="new-password" />
              </label>
              <button className="btn btn-blue" type="submit">
                Change
              </button>
            </form>
          </section>

          <section className="dash-card" id="newsletter">
            <h2>Newsletter</h2>
            <p style={{ color: 'var(--muted)' }}>{newsletterOn ? 'You receive our newsletter.' : 'You are not subscribed to the newsletter.'}</p>
            <form method="post" action="/api/account/newsletter">
              <input type="hidden" name="on" value={newsletterOn ? '0' : '1'} />
              <button className="btn btn-outline-dark" type="submit">
                {newsletterOn ? 'Unsubscribe' : 'Subscribe'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
