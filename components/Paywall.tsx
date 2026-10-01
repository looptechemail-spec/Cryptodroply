import Link from 'next/link'
import { PRO_PRICE_LABEL } from '@/lib/access'

export function Paywall({ title, text }: { title: string; text: string }) {
  return (
    <div className="paywall">
      <span className="paywall-lock" aria-hidden="true">&#128274;</span>
      <h2>{title}</h2>
      <p>{text} PRO is {PRO_PRICE_LABEL}, cancel any time.</p>
      <Link href="/signup?plan=pro" className="btn btn-yellow">
        Get PRO
      </Link>
      <Link href="/login" className="paywall-login">
        Already a member? Log in
      </Link>
    </div>
  )
}
