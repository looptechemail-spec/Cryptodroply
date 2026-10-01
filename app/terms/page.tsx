import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { LEGAL_EMAIL } from '@/components/LegalPage'

export const metadata: Metadata = { title: 'Terms of use', description: 'The rules for using Cryptodroply, the PRO plan and the referral program.' }

export default function Terms() {
  return (
    <LegalPage title="Terms of use" intro="The rules for using Cryptodroply, the PRO plan and the referral program.">
      <div className="sec">
        <h2>The service</h2>
        <p>Cryptodroply is a directory and a source of educational content about crypto tools. Part of the content is free. Some sections, tutorials and analyses are reserved for members of the PRO plan. By using the site you accept these terms. You must be 18 or older.</p>
      </div>
      <div className="sec">
        <h2>Account</h2>
        <p>You are responsible for keeping your password safe and for what happens in your account. One account is for one person: sharing PRO access with others is not allowed.</p>
      </div>
      <div className="sec">
        <h2>PRO plan</h2>
        <p>PRO costs 14 euro per month and renews every month until you cancel. Prices are shown with applicable taxes where required. You can cancel at any time from your account, and access stays active until the end of the period you have paid. Payments are processed by Stripe.</p>
        <p>Because PRO gives immediate access to digital content, by subscribing you ask us to start the service right away. Where the law gives you a right of withdrawal and you have not yet used the content, write to <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> within 14 days and we will review your request.</p>
      </div>
      <div className="sec">
        <h2>Referral program</h2>
        <p>Members can earn 30 percent of what a person they refer pays, for as long as that person stays subscribed. Commissions are held for 30 days to cover refunds and become payable once you reach 20 euro. Amounts are calculated before taxes. Self referrals, fake accounts, spam and misleading promotion are not allowed, and we may cancel commissions and close accounts in case of abuse.</p>
      </div>
      <div className="sec">
        <h2>Content and intellectual property</h2>
        <p>Texts, analyses, videos and design are ours or used with permission. You may read and share links to them, but you may not copy, resell or republish PRO content. Names and logos of the tools belong to their owners.</p>
      </div>
      <div className="sec">
        <h2>No financial advice</h2>
        <p>Everything on Cryptodroply is for information and education. Please read the <Link href="/disclaimer">disclaimer</Link>.</p>
      </div>
      <div className="sec">
        <h2>Liability</h2>
        <p>We work to keep information accurate and up to date, but tools change and we cannot guarantee it is complete. To the extent allowed by law, we are not liable for losses arising from the use of the site or of third party tools. Nothing here limits rights you have by law as a consumer.</p>
      </div>
      <div className="sec">
        <h2>Changes and law</h2>
        <p>We may update these terms and will publish the new version here. They are governed by Italian law, without removing the consumer protections of the country where you live.</p>
      </div>
      <div className="sec">
        <h2>Contact</h2>
        <p><a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a></p>
      </div>
    </LegalPage>
  )
}
