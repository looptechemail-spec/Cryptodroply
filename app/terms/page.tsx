import type { Metadata } from 'next'
import Link from '@/components/LocLink'
import LegalPage, { LEGAL_EMAIL, LEGAL_NAME, LEGAL_VAT } from '@/components/LegalPage'
import { i18n } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Terms of use', 'Termini di utilizzo'),
    description: t('The rules for using Cryptodroply, the PRO plan and the referral program.', 'Le regole per usare Cryptodroply, il piano PRO e il programma referral.'),
  }
}

export default async function Terms() {
  const { t, it } = await i18n()
  return (
    <LegalPage title={t('Terms of use', 'Termini di utilizzo')} intro={t('The rules for using Cryptodroply, the PRO plan and the referral program.', 'Le regole per usare Cryptodroply, il piano PRO e il programma referral.')}>
      <div className="sec">
        <h2>{t('The service', 'Il servizio')}</h2>
        <p>{t('Cryptodroply is a directory and a source of educational content about crypto tools. Part of the content is free. Some sections, tutorials and analyses are reserved for members of the PRO plan. By using the site you accept these terms. You must be 18 or older.', 'Cryptodroply è una directory e una fonte di contenuti educativi sugli strumenti crypto. Una parte dei contenuti è gratuita. Alcune sezioni, tutorial e analisi sono riservati agli iscritti al piano PRO. Usando il sito accetti questi termini. Devi avere almeno 18 anni.')}</p>
      </div>
      <div className="sec">
        <h2>Account</h2>
        <p>{t('You are responsible for keeping your password safe and for what happens in your account. One account is for one person: sharing PRO access with others is not allowed.', 'Sei responsabile di custodire la tua password e di ciò che accade nel tuo account. Un account è per una sola persona: non è consentito condividere l\'accesso PRO con altri.')}</p>
      </div>
      <div className="sec">
        <h2>{t('PRO plan', 'Piano PRO')}</h2>
        <p>{t('PRO costs 14 euro per month and renews every month until you cancel. Prices are shown with applicable taxes where required. You can cancel at any time from your account, and access stays active until the end of the period you have paid. Payments are processed by Stripe.', 'PRO costa 14 euro al mese e si rinnova ogni mese fino a quando non disdici. I prezzi sono mostrati con le imposte applicabili dove richiesto. Puoi disdire in qualsiasi momento dal tuo account e l\'accesso resta attivo fino alla fine del periodo che hai pagato. I pagamenti sono elaborati da Stripe.')}</p>
        <p>{it
          ? <>Poiché PRO dà accesso immediato a contenuti digitali, abbonandoti ci chiedi di avviare subito il servizio. Dove la legge ti riconosce un diritto di recesso e non hai ancora usato i contenuti, scrivi a <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> entro 14 giorni e valuteremo la tua richiesta.</>
          : <>Because PRO gives immediate access to digital content, by subscribing you ask us to start the service right away. Where the law gives you a right of withdrawal and you have not yet used the content, write to <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> within 14 days and we will review your request.</>}</p>
      </div>
      <div className="sec">
        <h2>{t('Referral program', 'Programma referral')}</h2>
        <p>{t('Members can earn 30 percent of what a person they refer pays, for as long as that person stays subscribed. Commissions are held for 30 days to cover refunds and become payable once you reach 20 euro. Amounts are calculated before taxes. Self referrals, fake accounts, spam and misleading promotion are not allowed, and we may cancel commissions and close accounts in case of abuse.', 'Gli iscritti ricevono il 30 percento di ciò che paga una persona da loro segnalata, finché quella persona resta abbonata. Le commissioni sono trattenute per 30 giorni per coprire i rimborsi e diventano pagabili una volta raggiunti 20 euro. Gli importi sono calcolati al lordo delle imposte. Non sono consentiti auto-referral, account falsi, spam e promozioni ingannevoli, e in caso di abuso possiamo annullare le commissioni e chiudere gli account.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Content and intellectual property', 'Contenuti e proprietà intellettuale')}</h2>
        <p>{t('Texts, analyses, videos and design are ours or used with permission. You may read and share links to them, but you may not copy, resell or republish PRO content. Names and logos of the tools belong to their owners.', 'Testi, analisi, video e design sono nostri o usati con autorizzazione. Puoi leggerli e condividerne i link, ma non puoi copiare, rivendere o ripubblicare i contenuti PRO. I nomi e i loghi degli strumenti appartengono ai rispettivi proprietari.')}</p>
      </div>
      <div className="sec">
        <h2>{t('No financial advice', 'Nessuna consulenza finanziaria')}</h2>
        <p>{it
          ? <>Tutto ciò che c'è su Cryptodroply è a scopo informativo ed educativo. Leggi il <Link href="/disclaimer">disclaimer</Link>.</>
          : <>Everything on Cryptodroply is for information and education. Please read the <Link href="/disclaimer">disclaimer</Link>.</>}</p>
      </div>
      <div className="sec">
        <h2>{t('Liability', 'Responsabilità')}</h2>
        <p>{t('We work to keep information accurate and up to date, but tools change and we cannot guarantee it is complete. To the extent allowed by law, we are not liable for losses arising from the use of the site or of third party tools. Nothing here limits rights you have by law as a consumer.', 'Ci impegniamo a mantenere le informazioni accurate e aggiornate, ma gli strumenti cambiano e non possiamo garantire che siano complete. Nei limiti consentiti dalla legge, non siamo responsabili delle perdite derivanti dall\'uso del sito o di strumenti di terze parti. Nulla qui limita i diritti che la legge ti riconosce come consumatore.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Changes and law', 'Modifiche e legge applicabile')}</h2>
        <p>{t('We may update these terms and will publish the new version here. They are governed by Italian law, without removing the consumer protections of the country where you live.', 'Possiamo aggiornare questi termini e pubblicheremo qui la nuova versione. Sono regolati dalla legge italiana, senza eliminare le tutele del consumatore del paese in cui vivi.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Who we are', 'Chi siamo')}</h2>
        <p>{it
          ? <>Cryptodroply è gestito da {LEGAL_NAME}, partita IVA {LEGAL_VAT}. Contatto: <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.</>
          : <>Cryptodroply is operated by {LEGAL_NAME}, VAT number {LEGAL_VAT}. Contact: <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.</>}</p>
      </div>
    </LegalPage>
  )
}
