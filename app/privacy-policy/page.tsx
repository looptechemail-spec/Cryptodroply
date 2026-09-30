import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy policy' }

export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <h1>Privacy policy</h1>
        <p style={{ color: 'var(--muted)' }}>How Cryptodroply handles your data.</p>
      </div>
      <div className="prose" style={{ margin: '24px 0 96px' }}>
        <div className="sec">
          <h2>Who we are</h2>
          <p>Cryptodroply is a directory of crypto tools. Data controller: [company name, address and contact email to be completed before launch].</p>
        </div>
        <div className="sec">
          <h2>What we collect</h2>
          <p>Account: your email, name (optional) and a password stored only as a secure hash. Payments: handled by Stripe, we never see or store your card number. Newsletter: your email and the time you confirmed. Contact form: the details you write. Affiliate links: we count clicks with an anonymous code that cannot identify you.</p>
        </div>
        <div className="sec">
          <h2>Why and on what basis</h2>
          <p>To run your account and subscription (contract), to send the newsletter (your consent, which you can withdraw at any time), to answer your messages (legitimate interest) and to understand which tools are useful (anonymous statistics).</p>
        </div>
        <div className="sec">
          <h2>Who receives your data</h2>
          <p>Our service providers only: hosting (Railway), payments (Stripe) and email delivery. We do not sell your data.</p>
        </div>
        <div className="sec">
          <h2>Affiliate links</h2>
          <p>Some links to tools are affiliate links. If you sign up through them we may earn a commission at no extra cost to you. This never changes how we describe a tool.</p>
        </div>
        <div className="sec">
          <h2>Your rights</h2>
          <p>You can ask to see, correct, export or delete your data, and unsubscribe from emails from the link in every message. Write to us from the contact page.</p>
        </div>
      </div>
    </div>
  )
}
