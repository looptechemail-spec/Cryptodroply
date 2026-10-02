import Link from './LocLink'
import Logo from './Logo'
import CookieSettingsLink from './CookieSettingsLink'
import { SECTIONS, sectionHref } from '@/lib/sections'
import { i18n } from '@/lib/i18n'
import { sec } from '@/lib/sections-it'

export default async function Footer() {
  const { t, it } = await i18n()
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <Logo />
          <p style={{ maxWidth: 420, marginTop: 16 }}>
            {t('The crypto tools directory for wallets, exchanges, airdrops, privacy, security and analysis.', 'La directory di strumenti crypto per wallet, exchange, airdrop, privacy, sicurezza e analisi.')}
          </p>
          <form className="nl" method="post" action="/api/subscribe">
            <label htmlFor="nl-email" className="sr-only">
              {t('Email address', 'Indirizzo email')}
            </label>
            <input id="nl-email" name="email" type="email" required placeholder={t('Your email', 'La tua email')} />
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
            <button type="submit">{t('Subscribe', 'Iscriviti')}</button>
          </form>
          <p style={{ fontSize: 13, marginTop: 10, opacity: 0.85 }}>
            {t('By subscribing you agree to receive our newsletter. We will email you to confirm, and you can unsubscribe at any time.', 'Iscrivendoti accetti di ricevere la nostra newsletter. Ti scriveremo per confermare e puoi disiscriverti in qualsiasi momento.')}
          </p>
        </div>
        <div className="col">
          <b>{t('Sections', 'Sezioni')}</b>
          {SECTIONS.slice(0, 4).map((s) => (
            <Link key={s.key} href={sectionHref(s.key)}>
              {sec(s, it).title}
            </Link>
          ))}
        </div>
        <div className="col">
          <b>{t('Company', 'Azienda')}</b>
          <Link href="/best">{t('Best lists', 'Le migliori liste')}</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/affiliate">{t('Earn 30%', 'Affiliati 30%')}</Link>
          <Link href="/contact">{t('Contact', 'Contatti')}</Link>
          <Link href="/privacy-policy">{t('Privacy policy', 'Privacy policy')}</Link>
          <Link href="/cookie-policy">{t('Cookie policy', 'Cookie policy')}</Link>
          <CookieSettingsLink label={t('Cookie settings', 'Impostazioni cookie')} />
          <Link href="/terms">{t('Terms of use', 'Termini di utilizzo')}</Link>
          <Link href="/disclaimer">{t('Disclaimer', 'Disclaimer')}</Link>
        </div>
      </div>
      <div className="container footer-legal">
        <p>
          {t('Not financial advice. Crypto is risky and you can lose your money. Some links are affiliate links.', 'Non è un consiglio finanziario. Le crypto sono rischiose e puoi perdere il tuo denaro. Alcuni link sono link di affiliazione.')}{' '}
          <Link href="/disclaimer">{t('Read more', 'Leggi di più')}</Link>
        </p>
        <p>© {new Date().getFullYear()} Cryptodroply · {t('VAT', 'P.IVA')} 04210160133</p>
      </div>
    </footer>
  )
}
