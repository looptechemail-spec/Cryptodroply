import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = { title: 'Disclaimer and affiliate disclosure', description: 'Cryptodroply does not give financial advice. Some links are affiliate links.' }

export default function Disclaimer() {
  return (
    <LegalPage title="Disclaimer" intro="Not financial advice, and how we earn money.">
      <div className="sec">
        <h2>Not financial advice</h2>
        <p>Cryptodroply provides information and education only. Nothing on this site, including analyses, tutorials and tool reviews, is investment, financial, tax or legal advice, or an invitation to buy or sell any asset. Do your own research and talk to a qualified professional before you decide.</p>
      </div>
      <div className="sec">
        <h2>Crypto is risky</h2>
        <p>Crypto assets are volatile and you can lose all the money you put in. Airdrops, meme tokens and new protocols carry extra risk, including scams and smart contract failures. Past results do not guarantee future results. Only use money you can afford to lose and never share your seed phrase.</p>
      </div>
      <div className="sec">
        <h2>Affiliate disclosure</h2>
        <p>Some links to tools and exchanges are affiliate links. If you sign up through them we may earn a commission or a bonus, at no extra cost to you, and this helps us keep the free content online. It does not change how we describe a tool. We also run our own referral program, see the <Link href="/affiliate">referral page</Link>.</p>
      </div>
      <div className="sec">
        <h2>Third party tools</h2>
        <p>Tools in the directory are made by other companies. We do not control them and we do not guarantee their security, availability or fees. Check the official site before using any of them.</p>
      </div>
    </LegalPage>
  )
}
