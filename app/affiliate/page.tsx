import Link from 'next/link'
import type { Metadata } from 'next'
import { getUser } from '@/lib/auth'
import { COMMISSION_RATE, HOLD_DAYS, MIN_PAYOUT_CENTS, RECURRING, euro } from '@/lib/referral'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Earn 30% | Cryptodroply affiliate programme',
  description: 'Share your personal link and earn 30% of every PRO payment from the people you bring to Cryptodroply.',
}

export default async function Affiliate() {
  const user = await getUser()
  const pct = COMMISSION_RATE * 100
  const steps = [
    ['Create a free account', 'Your personal link is in your account page, ready to copy.'],
    ['Share it', 'Post it in your videos, channels, newsletter or send it to friends.'],
    ['Earn', `When someone you brought subscribes to PRO you earn ${pct}% of what they pay: ${euro(1400 * COMMISSION_RATE)} on each €14 payment${RECURRING ? ', for every month they stay' : ''}.`],
  ]
  return (
    <section className="block">
      <div className="container" style={{ maxWidth: 860 }}>
        <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Earn {pct}% with Cryptodroply</h1>
        <p className="lead">Every member gets a personal referral link. Share it and earn a commission on each PRO payment from the people who join through it.</p>
        <div className="start-grid" style={{ marginTop: 28 }}>
          {steps.map(([t, d], i) => (
            <div key={t} className="start-card">
              <span className="start-title">{i + 1}. {t}</span>
              <span className="start-text">{d}</span>
            </div>
          ))}
        </div>
        <div className="faq">
          <details><summary>How long does the link last?</summary><p>When someone opens your link we remember it for 30 days. If they sign up in that time, they are linked to you for good.</p></details>
          <details><summary>When do I get paid?</summary><p>Each commission becomes payable {HOLD_DAYS} days after the payment, so refunds can be handled. We pay when your balance reaches {euro(MIN_PAYOUT_CENTS)}, to the PayPal email or USDT address you save in your account.</p></details>
          <details><summary>What is not allowed?</summary><p>Using your own link for your own purchases, fake sign-ups, and misleading promises of profits. Such commissions are cancelled.</p></details>
          <details><summary>What if a payment is refunded?</summary><p>The commission for that payment is cancelled.</p></details>
        </div>
        <div style={{ marginTop: 32 }}>
          {user ? (
            <Link href="/account#earn" className="btn btn-blue">Get my link</Link>
          ) : (
            <Link href="/signup" className="btn btn-blue">Create a free account</Link>
          )}
        </div>
      </div>
    </section>
  )
}
