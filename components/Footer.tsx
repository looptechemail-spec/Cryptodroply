import Link from 'next/link'
import Logo from './Logo'
import CookieSettingsLink from './CookieSettingsLink'
import { SECTIONS, sectionHref } from '@/lib/sections'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <Logo />
          <p style={{ maxWidth: 420, marginTop: 16 }}>
            The crypto tools directory for wallets, exchanges, airdrops, privacy, security and analysis.
          </p>
          <form className="nl" method="post" action="/api/subscribe">
            <label htmlFor="nl-email" className="sr-only">
              Email address
            </label>
            <input id="nl-email" name="email" type="email" required placeholder="Your email" />
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
            <button type="submit">Subscribe</button>
          </form>
          <p style={{ fontSize: 13, marginTop: 10, opacity: 0.85 }}>
            By subscribing you agree to receive our newsletter. We will email you to confirm, and you can unsubscribe at any time.
          </p>
        </div>
        <div className="col">
          <b>Sections</b>
          {SECTIONS.slice(0, 4).map((s) => (
            <Link key={s.key} href={sectionHref(s.key)}>
              {s.title}
            </Link>
          ))}
        </div>
        <div className="col">
          <b>Company</b>
          <Link href="/blog">Blog</Link>
          <Link href="/affiliate">Earn 30%</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy-policy">Privacy policy</Link>
          <Link href="/cookie-policy">Cookie policy</Link>
          <CookieSettingsLink />
          <Link href="/terms">Terms of use</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </div>
      </div>
      <div className="container footer-legal">
        <p>
          Not financial advice. Crypto is risky and you can lose your money. Some links are affiliate links.{' '}
          <Link href="/disclaimer">Read more</Link>
        </p>
        <p>© {new Date().getFullYear()} Cryptodroply · Nicolò Allodio · VAT 04210160133</p>
      </div>
    </footer>
  )
}
