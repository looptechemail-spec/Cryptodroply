import Link from 'next/link'
import type { Metadata } from 'next'
import { getUser } from '@/lib/auth'
import { hasPro, PRO_PRICE_LABEL } from '@/lib/access'
import { FREE_FEATURES, PRO_FEATURES, FAQ } from '@/lib/plans'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Pricing | Cryptodroply',
  description: 'Cryptodroply is free to start. PRO is €14 per month and unlocks the Grow and Privacy sections and full analyses.',
}

export default async function Pricing() {
  const user = await getUser()
  const pro = await hasPro()
  return (
    <>
      <section className="block">
        <div className="container">
          <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', fontWeight: 800, letterSpacing: '-0.02em' }}>Simple pricing</h1>
          <p className="lead">Free to start. One paid plan, billed monthly, cancel whenever you like.</p>
          <div className="plans">
            <div className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-price">
                <b>€0</b>
                <span>no card needed</span>
              </div>
              <ul className="plan-list">
                {FREE_FEATURES.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {user ? (
                <Link href="/account" className="btn btn-blue">
                  Go to your account
                </Link>
              ) : (
                <Link href="/signup" className="btn btn-blue">
                  Get started free
                </Link>
              )}
            </div>
            <div className="plan plan-pro">
              <div className="plan-name">
                PRO <span className="badge-pro pro-on-dark">All access</span>
              </div>
              <div className="plan-price">
                <b>€14</b>
                <span>per month</span>
              </div>
              <ul className="plan-list">
                {PRO_FEATURES.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {pro ? (
                <Link href="/account" className="btn btn-yellow">
                  You have PRO. Manage it
                </Link>
              ) : user ? (
                <form method="post" action="/api/stripe/checkout">
                  <button className="btn btn-yellow" type="submit" style={{ width: '100%' }} aria-label={`Get PRO, ${PRO_PRICE_LABEL}`}>
                    Get PRO
                  </button>
                </form>
              ) : (
                <Link href="/signup?plan=pro" className="btn btn-yellow" aria-label={`Get PRO, ${PRO_PRICE_LABEL}`}>
                  Get PRO
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="block">
        <div className="container">
          <h2>Questions</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
