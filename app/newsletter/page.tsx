import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Newsletter', robots: { index: false } }

const MESSAGES: Record<string, [string, string]> = {
  pending: ['Check your inbox', 'We sent you an email. Click the button inside to confirm your subscription.'],
  already: ['You are already subscribed', 'Nothing else to do. New tools and guides will reach your inbox.'],
  confirmed: ['You are subscribed', 'Thank you. You will get new tools, airdrops and guides from Cryptodroply.'],
  unsubscribed: ['You are unsubscribed', 'You will not receive our emails any more.'],
  invalid: ['That did not work', 'The link is not valid or has expired. Please subscribe again from the footer.'],
}

export default async function NewsletterStatus({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const [title, text] = MESSAGES[status ?? ''] ?? MESSAGES.invalid
  return (
    <div className="container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>{title}</h1>
        <p className="auth-sub">{text}</p>
        <p style={{ marginTop: 24 }}>
          <Link href="/" className="btn btn-blue">
            Back to the site
          </Link>
        </p>
      </div>
    </div>
  )
}
