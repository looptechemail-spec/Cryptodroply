import Link from '@/components/LocLink'
import type { Metadata } from 'next'
import { getUser } from '@/lib/auth'
import { hasPro, PRO_PRICE_LABEL, PRO_PRICE_LABEL_IT } from '@/lib/access'
import { FREE_FEATURES, PRO_FEATURES, FAQ, FREE_FEATURES_IT, PRO_FEATURES_IT, FAQ_IT } from '@/lib/plans'
import { i18n } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Pricing', 'Prezzi'),
    description: t('Cryptodroply is free to start. PRO is €14 per month and unlocks the Grow and Privacy sections and full analyses.', 'Cryptodroply è gratis per iniziare. PRO costa 14 € al mese e sblocca le sezioni Grow e Privacy e le analisi complete.'),
  }
}

export default async function Pricing() {
  const user = await getUser()
  const pro = await hasPro()
  const { t, it } = await i18n()
  const priceLabel = it ? PRO_PRICE_LABEL_IT : PRO_PRICE_LABEL
  const freeFeatures = it ? FREE_FEATURES_IT : FREE_FEATURES
  const proFeatures = it ? PRO_FEATURES_IT : PRO_FEATURES
  const faq = it ? FAQ_IT : FAQ
  return (
    <>
      <section className="block">
        <div className="container">
          <h1 style={{ fontSize: 'clamp(34px,5vw,56px)', fontWeight: 800, letterSpacing: '-0.02em' }}>{t('Simple pricing', 'Prezzi semplici')}</h1>
          <p className="lead">{t('Free to start. One paid plan, billed monthly, cancel whenever you like.', 'Gratis per iniziare. Un solo piano a pagamento, addebitato ogni mese, disdici quando vuoi.')}</p>
          <div className="plans">
            <div className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-price">
                <b>€0</b>
                <span>{t('no card needed', 'nessuna carta richiesta')}</span>
              </div>
              <ul className="plan-list">
                {freeFeatures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {user ? (
                <Link href="/account" className="btn btn-blue">
                  {t('Go to your account', 'Vai al tuo account')}
                </Link>
              ) : (
                <Link href="/signup" className="btn btn-blue">
                  {t('Get started free', 'Inizia gratis')}
                </Link>
              )}
            </div>
            <div className="plan plan-pro">
              <div className="plan-name">
                PRO <span className="badge-pro pro-on-dark">{t('All access', 'Accesso completo')}</span>
              </div>
              <div className="plan-price">
                <b>€14</b>
                <span>{t('per month', 'al mese')}</span>
              </div>
              <ul className="plan-list">
                {proFeatures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {pro ? (
                <Link href="/account" className="btn btn-yellow">
                  {t('You have PRO. Manage it', 'Hai PRO. Gestiscilo')}
                </Link>
              ) : user ? (
                <form method="post" action="/api/stripe/checkout">
                  <button className="btn btn-yellow" type="submit" style={{ width: '100%' }} aria-label={`${t('Get PRO', 'Passa a PRO')}, ${priceLabel}`}>
                    {t('Get PRO', 'Passa a PRO')}
                  </button>
                </form>
              ) : (
                <Link href="/signup?plan=pro" className="btn btn-yellow" aria-label={`${t('Get PRO', 'Passa a PRO')}, ${priceLabel}`}>
                  {t('Get PRO', 'Passa a PRO')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="block">
        <div className="container">
          <h2>{t('Questions', 'Domande')}</h2>
          <div className="faq">
            {faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
