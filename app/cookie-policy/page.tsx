import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = { title: 'Cookie policy', description: 'Which cookies Cryptodroply uses and how to control them.' }

export default function Cookies() {
  return (
    <LegalPage title="Cookie policy" intro="We keep cookies to the minimum. No advertising, no tracking across other sites.">
      <div className="sec">
        <h2>Cookies we set</h2>
        <table className="legal-table">
          <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th><th>Type</th></tr></thead>
          <tbody>
            <tr><td>cd_session</td><td>Keeps you logged in</td><td>30 days</td><td>Necessary</td></tr>
            <tr><td>cd_consent</td><td>Remembers your cookie choice</td><td>6 months</td><td>Necessary</td></tr>
            <tr><td>cd_ref</td><td>Remembers the referral code of the person who invited you, so they are credited if you subscribe. Set only if you arrive from a referral link and you accept</td><td>30 days</td><td>Functional, with your consent</td></tr>
            <tr><td>cd_admin</td><td>Administrator access, never set for visitors</td><td>12 hours</td><td>Necessary</td></tr>
          </tbody>
        </table>
      </div>
      <div className="sec">
        <h2>Statistics</h2>
        <p>We count page views in an anonymous way, with a hashed value that cannot identify you. For this reason we do not use analytics cookies.</p>
      </div>
      <div className="sec">
        <h2>Third parties</h2>
        <p>YouTube videos use the privacy enhanced mode (youtube-nocookie.com), which does not store cookies until you press play. When you pay, Stripe may set its own cookies to prevent fraud. Their policies apply to those cookies. Some links lead to tools that are not ours and may set their own cookies.</p>
      </div>
      <div className="sec">
        <h2>How to control cookies</h2>
        <p>You can change your choice at any time with "Cookie settings" in the footer. You can also delete or block cookies from your browser settings. If you block the necessary ones, login will not work. More about how we treat your data in the <Link href="/privacy-policy">privacy policy</Link>.</p>
      </div>
    </LegalPage>
  )
}
