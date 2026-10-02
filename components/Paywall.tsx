import Link from '@/components/LocLink'
import { PRO_PRICE_LABEL } from '@/lib/access'
import { i18n } from '@/lib/i18n'

export async function Paywall({ title, text }: { title: string; text: string }) {
  const { t } = await i18n()
  return (
    <div className="paywall">
      <span className="paywall-lock" aria-hidden="true">&#128274;</span>
      <h2>{title}</h2>
      <p>{text} {t(`PRO is ${PRO_PRICE_LABEL}, cancel any time.`, `PRO costa ${PRO_PRICE_LABEL}, disdici quando vuoi.`)}</p>
      <Link href="/signup?plan=pro" className="btn btn-yellow">
        {t('Get PRO', 'Passa a PRO')}
      </Link>
      <Link href="/login" className="paywall-login">
        {t('Already a member? Log in', 'Sei già iscritto? Accedi')}
      </Link>
    </div>
  )
}
