import Link from '@/components/LocLink'
import type { Metadata } from 'next'
import { getUser } from '@/lib/auth'
import { i18n } from '@/lib/i18n'
import { COMMISSION_RATE, HOLD_DAYS, MIN_PAYOUT_CENTS, RECURRING, euro } from '@/lib/referral'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Earn 30% | Cryptodroply affiliate programme', 'Il 30% è tuo | Programma affiliati Cryptodroply'),
    description: t('Share your personal link and earn 30% of every PRO payment from the people you bring to Cryptodroply.', 'Condividi il tuo link personale e ricevi il 30% di ogni pagamento PRO delle persone che porti su Cryptodroply.'),
  }
}

export default async function Affiliate() {
  const user = await getUser()
  const { t } = await i18n()
  const pct = COMMISSION_RATE * 100
  const steps = [
    [t('Create a free account', 'Crea un account gratuito'), t('Your personal link is in your account page, ready to copy.', 'Il tuo link personale è nella pagina del tuo account, pronto da copiare.')],
    [t('Share it', 'Condividilo'), t('Post it in your videos, channels, newsletter or send it to friends.', 'Pubblicalo nei tuoi video, canali, newsletter oppure mandalo agli amici.')],
    [t('Earn', 'Ricevi'), t(
      `When someone you brought subscribes to PRO you earn ${pct}% of what they pay: ${euro(1400 * COMMISSION_RATE)} on each €14 payment${RECURRING ? ', for every month they stay' : ''}.`,
      `Quando una persona che hai portato si abbona a PRO ricevi il ${pct}% di ciò che paga: ${euro(1400 * COMMISSION_RATE)} su ogni pagamento da 14 €${RECURRING ? ', per ogni mese in cui resta abbonata' : ''}.`,
    )],
  ]
  return (
    <section className="block">
      <div className="container" style={{ maxWidth: 860 }}>
        <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', fontWeight: 800, letterSpacing: '-0.02em' }}>{t(`Earn ${pct}% with Cryptodroply`, `Ricevi il ${pct}% con Cryptodroply`)}</h1>
        <p className="lead">{t('Every member gets a personal referral link. Share it and earn a commission on each PRO payment from the people who join through it.', 'Ogni iscritto riceve un link referral personale. Condividilo e ricevi una commissione su ogni pagamento PRO delle persone che si iscrivono tramite il tuo link.')}</p>
        <div className="start-grid" style={{ marginTop: 28 }}>
          {steps.map(([t, d], i) => (
            <div key={t} className="start-card">
              <span className="start-title">{i + 1}. {t}</span>
              <span className="start-text">{d}</span>
            </div>
          ))}
        </div>
        <div className="faq">
          <details><summary>{t('How long does the link last?', 'Quanto dura il link?')}</summary><p>{t('When someone opens your link we remember it for 30 days. If they sign up in that time, they are linked to you for good.', 'Quando qualcuno apre il tuo link lo ricordiamo per 30 giorni. Se si registra in quel periodo, resta collegato a te per sempre.')}</p></details>
          <details><summary>{t('When do I get paid?', 'Quando vengo pagato?')}</summary><p>{t(`Each commission becomes payable ${HOLD_DAYS} days after the payment, so refunds can be handled. We pay when your balance reaches ${euro(MIN_PAYOUT_CENTS)}, to the PayPal email or USDT address you save in your account.`, `Ogni commissione diventa pagabile ${HOLD_DAYS} giorni dopo il pagamento, così i rimborsi possono essere gestiti. Paghiamo quando il tuo saldo raggiunge ${euro(MIN_PAYOUT_CENTS)}, all'email PayPal o all'indirizzo USDT che salvi nel tuo account.`)}</p></details>
          <details><summary>{t('What is not allowed?', 'Cosa non è consentito?')}</summary><p>{t('Using your own link for your own purchases, fake sign-ups, and misleading promises of profits. Such commissions are cancelled.', 'Usare il tuo link per i tuoi acquisti, registrazioni false e promesse ingannevoli. Queste commissioni vengono annullate.')}</p></details>
          <details><summary>{t('What if a payment is refunded?', 'E se un pagamento viene rimborsato?')}</summary><p>{t('The commission for that payment is cancelled.', 'La commissione per quel pagamento viene annullata.')}</p></details>
        </div>
        <div style={{ marginTop: 32 }}>
          {user ? (
            <Link href="/account#earn" className="btn btn-blue">{t('Get my link', 'Ottieni il mio link')}</Link>
          ) : (
            <Link href="/signup" className="btn btn-blue">{t('Create a free account', 'Crea un account gratuito')}</Link>
          )}
        </div>
      </div>
    </section>
  )
}
