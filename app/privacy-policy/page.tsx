import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { LEGAL_EMAIL } from '@/components/LegalPage'

export const metadata: Metadata = { title: 'Privacy policy', description: 'How Cryptodroply collects, uses and protects your personal data.' }

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" intro="How Cryptodroply handles your personal data, in plain words.">
      <div className="sec">
        <h2>Who is responsible</h2>
        <p>Cryptodroply is run by an independent operator. For any question about your data, write to <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> or use the <Link href="/contact">contact page</Link>.</p>
      </div>
      <div className="sec">
        <h2>What we collect and why</h2>
        <table className="legal-table">
          <thead><tr><th>Data</th><th>Purpose</th><th>Legal basis</th></tr></thead>
          <tbody>
            <tr><td>Email, name (optional), password (stored only as a secure hash)</td><td>Create and run your account</td><td>Contract</td></tr>
            <tr><td>Subscription status and payment references (card details are handled by Stripe, we never see them)</td><td>Manage the PRO plan, invoices, refunds</td><td>Contract, legal obligation</td></tr>
            <tr><td>Email and confirmation time</td><td>Send the newsletter</td><td>Consent, which you can withdraw at any time</td></tr>
            <tr><td>Message you write in the contact form</td><td>Reply to you</td><td>Legitimate interest</td></tr>
            <tr><td>Referral code and affiliate clicks (anonymous code, no identity)</td><td>Credit the referral program and count clicks on tools</td><td>Legitimate interest, contract for partners</td></tr>
            <tr><td>Anonymous page views (hashed, not tied to a person)</td><td>Understand which content is useful</td><td>Legitimate interest</td></tr>
            <tr><td>Technical logs (IP address, browser, time)</td><td>Security and fraud prevention</td><td>Legitimate interest</td></tr>
          </tbody>
        </table>
      </div>
      <div className="sec">
        <h2>Cookies</h2>
        <p>We use only the few cookies we need to run the site. Details are in the <Link href="/cookie-policy">cookie policy</Link>.</p>
      </div>
      <div className="sec">
        <h2>Who receives your data</h2>
        <p>Only service providers that work for us: hosting and database (Railway), payments (Stripe) and email delivery (Resend). Videos are embedded from YouTube in privacy enhanced mode. We do not sell your data and we do not use it for advertising profiles.</p>
      </div>
      <div className="sec">
        <h2>Transfers outside the EU</h2>
        <p>Some providers may process data outside the European Economic Area, for example in the United States. In that case the transfer relies on adequacy decisions or on the standard contractual clauses approved by the European Commission.</p>
      </div>
      <div className="sec">
        <h2>How long we keep data</h2>
        <p>Account data until you delete your account. Payment and invoice records for the period required by tax law. Newsletter data until you unsubscribe. Contact messages for up to 24 months. Anonymous statistics may be kept longer because they cannot identify you.</p>
      </div>
      <div className="sec">
        <h2>Your rights</h2>
        <p>Under the GDPR you can ask to access, correct, export or delete your data, to limit or object to its use, and to withdraw consent at any time. You can unsubscribe from every email with the link inside it. Write to <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. You also have the right to complain to your data protection authority, in Italy the Garante per la protezione dei dati personali (garanteprivacy.it).</p>
      </div>
      <div className="sec">
        <h2>Security</h2>
        <p>Passwords are hashed, connections use HTTPS and access to the database is limited. No system is perfectly secure, so we also ask you to use a strong, unique password.</p>
      </div>
      <div className="sec">
        <h2>Minors</h2>
        <p>Cryptodroply is for people aged 18 or over. We do not knowingly collect data from minors.</p>
      </div>
      <div className="sec">
        <h2>Affiliate links</h2>
        <p>Some links to tools are affiliate links, see the <Link href="/disclaimer">disclaimer</Link>.</p>
      </div>
      <div className="sec">
        <h2>Changes</h2>
        <p>If we change this policy we publish the new version here and update the date at the top. For important changes we will also email our members.</p>
      </div>
    </LegalPage>
  )
}
