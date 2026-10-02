import type { Metadata } from 'next'
import Link from '@/components/LocLink'
import LegalPage from '@/components/LegalPage'
import { i18n } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Cookie policy', 'Cookie policy'),
    description: t('Which cookies Cryptodroply uses and how to control them.', 'Quali cookie usa Cryptodroply e come controllarli.'),
  }
}

export default async function Cookies() {
  const { t, it } = await i18n()
  return (
    <LegalPage title={t('Cookie policy', 'Cookie policy')} intro={t('We keep cookies to the minimum. No advertising, no tracking across other sites.', 'Teniamo i cookie al minimo. Nessuna pubblicità, nessun tracciamento su altri siti.')}>
      <div className="sec">
        <h2>{t('Cookies we set', 'I cookie che impostiamo')}</h2>
        <table className="legal-table">
          <thead><tr><th>{t('Name', 'Nome')}</th><th>{t('Purpose', 'Finalità')}</th><th>{t('Duration', 'Durata')}</th><th>{t('Type', 'Tipo')}</th></tr></thead>
          <tbody>
            <tr><td>cd_session</td><td>{t('Keeps you logged in', 'Ti mantiene connesso')}</td><td>{t('30 days', '30 giorni')}</td><td>{t('Necessary', 'Necessario')}</td></tr>
            <tr><td>cd_consent</td><td>{t('Remembers your cookie choice', 'Ricorda la tua scelta sui cookie')}</td><td>{t('6 months', '6 mesi')}</td><td>{t('Necessary', 'Necessario')}</td></tr>
            <tr><td>cd_ref</td><td>{t('Remembers the referral code of the person who invited you, so they are credited if you subscribe. Set only if you arrive from a referral link and you accept', 'Ricorda il codice referral della persona che ti ha invitato, così viene accreditata se ti abboni. Viene impostato solo se arrivi da un link referral e accetti')}</td><td>{t('30 days', '30 giorni')}</td><td>{t('Functional, with your consent', 'Funzionale, con il tuo consenso')}</td></tr>
            <tr><td>cd_admin</td><td>{t('Administrator access, never set for visitors', 'Accesso amministratore, mai impostato per i visitatori')}</td><td>{t('12 hours', '12 ore')}</td><td>{t('Necessary', 'Necessario')}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="sec">
        <h2>{t('Statistics', 'Statistiche')}</h2>
        <p>{t('We count page views in an anonymous way, with a hashed value that cannot identify you. For this reason we do not use analytics cookies.', 'Contiamo le visualizzazioni di pagina in modo anonimo, con un valore con hash che non permette di identificarti. Per questo motivo non usiamo cookie di analisi.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Third parties', 'Terze parti')}</h2>
        <p>{t('YouTube videos use the privacy enhanced mode (youtube-nocookie.com), which does not store cookies until you press play. When you pay, Stripe may set its own cookies to prevent fraud. Their policies apply to those cookies. Some links lead to tools that are not ours and may set their own cookies.', 'I video di YouTube usano la modalità privacy avanzata (youtube-nocookie.com), che non salva cookie finché non premi play. Quando paghi, Stripe può impostare i propri cookie per prevenire le frodi. Per quei cookie valgono le loro policy. Alcuni link portano a strumenti che non sono nostri e che possono impostare i propri cookie.')}</p>
      </div>
      <div className="sec">
        <h2>{t('How to control cookies', 'Come controllare i cookie')}</h2>
        <p>{it
          ? <>Puoi cambiare la tua scelta in qualsiasi momento con "Impostazioni cookie" nel footer. Puoi anche eliminare o bloccare i cookie dalle impostazioni del browser. Se blocchi quelli necessari, l'accesso non funzionerà. Scopri di più su come trattiamo i tuoi dati nell'<Link href="/privacy-policy">informativa sulla privacy</Link>.</>
          : <>You can change your choice at any time with "Cookie settings" in the footer. You can also delete or block cookies from your browser settings. If you block the necessary ones, login will not work. More about how we treat your data in the <Link href="/privacy-policy">privacy policy</Link>.</>}</p>
      </div>
    </LegalPage>
  )
}
