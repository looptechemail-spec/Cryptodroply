import type { Metadata } from 'next'
import Link from '@/components/LocLink'
import LegalPage, { LEGAL_EMAIL, LEGAL_NAME, LEGAL_VAT } from '@/components/LegalPage'
import { i18n } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Privacy policy', 'Informativa sulla privacy'),
    description: t('How Cryptodroply collects, uses and protects your personal data.', 'Come Cryptodroply raccoglie, usa e protegge i tuoi dati personali.'),
  }
}

export default async function Privacy() {
  const { t, it } = await i18n()
  return (
    <LegalPage title={t('Privacy policy', 'Informativa sulla privacy')} intro={t('How Cryptodroply handles your personal data, in plain words.', 'Come Cryptodroply tratta i tuoi dati personali, in parole semplici.')}>
      <div className="sec">
        <h2>{t('Who is responsible', 'Chi è il responsabile')}</h2>
        <p>{it
          ? <>Il titolare del trattamento è {LEGAL_NAME} (partita IVA {LEGAL_VAT}), che gestisce Cryptodroply. Per qualsiasi domanda sui tuoi dati scrivi a <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> oppure usa la <Link href="/contact">pagina contatti</Link>.</>
          : <>The data controller is {LEGAL_NAME} (VAT number {LEGAL_VAT}), who runs Cryptodroply. For any question about your data, write to <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> or use the <Link href="/contact">contact page</Link>.</>}</p>
      </div>
      <div className="sec">
        <h2>{t('What we collect and why', 'Cosa raccogliamo e perché')}</h2>
        <table className="legal-table">
          <thead><tr><th>{t('Data', 'Dati')}</th><th>{t('Purpose', 'Finalità')}</th><th>{t('Legal basis', 'Base giuridica')}</th></tr></thead>
          <tbody>
            <tr><td>{t('Email, name (optional), password (stored only as a secure hash)', 'Email, nome (facoltativo), password (conservata solo come hash sicuro)')}</td><td>{t('Create and run your account', 'Creare e gestire il tuo account')}</td><td>{t('Contract', 'Contratto')}</td></tr>
            <tr><td>{t('Subscription status and payment references (card details are handled by Stripe, we never see them)', 'Stato dell\'abbonamento e riferimenti dei pagamenti (i dati della carta sono gestiti da Stripe, noi non li vediamo mai)')}</td><td>{t('Manage the PRO plan, invoices, refunds', 'Gestire il piano PRO, le fatture, i rimborsi')}</td><td>{t('Contract, legal obligation', 'Contratto, obbligo di legge')}</td></tr>
            <tr><td>{t('Email and confirmation time', 'Email e data e ora di conferma')}</td><td>{t('Send the newsletter', 'Inviare la newsletter')}</td><td>{t('Consent, which you can withdraw at any time', 'Consenso, che puoi revocare in qualsiasi momento')}</td></tr>
            <tr><td>{t('Message you write in the contact form', 'Messaggio che scrivi nel modulo di contatto')}</td><td>{t('Reply to you', 'Risponderti')}</td><td>{t('Legitimate interest', 'Legittimo interesse')}</td></tr>
            <tr><td>{t('Referral code and affiliate clicks (anonymous code, no identity)', 'Codice referral e clic affiliati (codice anonimo, nessuna identità)')}</td><td>{t('Credit the referral program and count clicks on tools', 'Accreditare il programma referral e contare i clic sugli strumenti')}</td><td>{t('Legitimate interest, contract for partners', 'Legittimo interesse, contratto per i partner')}</td></tr>
            <tr><td>{t('Anonymous page views (hashed, not tied to a person)', 'Visualizzazioni di pagina anonime (con hash, non collegate a una persona)')}</td><td>{t('Understand which content is useful', 'Capire quali contenuti sono utili')}</td><td>{t('Legitimate interest', 'Legittimo interesse')}</td></tr>
            <tr><td>{t('Technical logs (IP address, browser, time)', 'Log tecnici (indirizzo IP, browser, orario)')}</td><td>{t('Security and fraud prevention', 'Sicurezza e prevenzione delle frodi')}</td><td>{t('Legitimate interest', 'Legittimo interesse')}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="sec">
        <h2>Cookie</h2>
        <p>{it
          ? <>Usiamo solo i pochi cookie necessari per far funzionare il sito. I dettagli sono nella <Link href="/cookie-policy">cookie policy</Link>.</>
          : <>We use only the few cookies we need to run the site. Details are in the <Link href="/cookie-policy">cookie policy</Link>.</>}</p>
      </div>
      <div className="sec">
        <h2>{t('Who receives your data', 'Chi riceve i tuoi dati')}</h2>
        <p>{t('Only service providers that work for us: hosting and database (Railway), payments (Stripe) and email delivery (Resend). Videos are embedded from YouTube in privacy enhanced mode. We do not sell your data and we do not use it for advertising profiles.', 'Solo fornitori di servizi che lavorano per noi: hosting e database (Railway), pagamenti (Stripe) e invio delle email (Resend). I video sono incorporati da YouTube in modalità privacy avanzata. Non vendiamo i tuoi dati e non li usiamo per profili pubblicitari.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Transfers outside the EU', 'Trasferimenti fuori dall\'UE')}</h2>
        <p>{t('Some providers may process data outside the European Economic Area, for example in the United States. In that case the transfer relies on adequacy decisions or on the standard contractual clauses approved by the European Commission.', 'Alcuni fornitori possono trattare dati fuori dallo Spazio economico europeo, per esempio negli Stati Uniti. In tal caso il trasferimento si basa su decisioni di adeguatezza o sulle clausole contrattuali tipo approvate dalla Commissione europea.')}</p>
      </div>
      <div className="sec">
        <h2>{t('How long we keep data', 'Per quanto tempo conserviamo i dati')}</h2>
        <p>{t('Account data until you delete your account. Payment and invoice records for the period required by tax law. Newsletter data until you unsubscribe. Contact messages for up to 24 months. Anonymous statistics may be kept longer because they cannot identify you.', 'I dati dell\'account fino a quando elimini il tuo account. I registri di pagamenti e fatture per il periodo richiesto dalla legge fiscale. I dati della newsletter fino alla disiscrizione. I messaggi di contatto fino a 24 mesi. Le statistiche anonime possono essere conservate più a lungo perché non permettono di identificarti.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Your rights', 'I tuoi diritti')}</h2>
        <p>{it
          ? <>Ai sensi del GDPR puoi chiedere di accedere ai tuoi dati, correggerli, esportarli o cancellarli, limitarne o opporti al loro uso e revocare il consenso in qualsiasi momento. Puoi disiscriverti da ogni email con il link al suo interno. Scrivi a <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. Hai inoltre il diritto di presentare reclamo all'autorità per la protezione dei dati personali, in Italia il Garante per la protezione dei dati personali (garanteprivacy.it).</>
          : <>Under the GDPR you can ask to access, correct, export or delete your data, to limit or object to its use, and to withdraw consent at any time. You can unsubscribe from every email with the link inside it. Write to <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. You also have the right to complain to your data protection authority, in Italy the Garante per la protezione dei dati personali (garanteprivacy.it).</>}</p>
      </div>
      <div className="sec">
        <h2>{t('Security', 'Sicurezza')}</h2>
        <p>{t('Passwords are hashed, connections use HTTPS and access to the database is limited. No system is perfectly secure, so we also ask you to use a strong, unique password.', 'Le password sono salvate con hash, le connessioni usano HTTPS e l\'accesso al database è limitato. Nessun sistema è perfettamente sicuro, quindi ti chiediamo anche di usare una password forte e unica.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Minors', 'Minori')}</h2>
        <p>{t('Cryptodroply is for people aged 18 or over. We do not knowingly collect data from minors.', 'Cryptodroply è riservato a persone di almeno 18 anni. Non raccogliamo consapevolmente dati di minori.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Affiliate links', 'Link di affiliazione')}</h2>
        <p>{it
          ? <>Alcuni link agli strumenti sono link di affiliazione, vedi il <Link href="/disclaimer">disclaimer</Link>.</>
          : <>Some links to tools are affiliate links, see the <Link href="/disclaimer">disclaimer</Link>.</>}</p>
      </div>
      <div className="sec">
        <h2>{t('Changes', 'Modifiche')}</h2>
        <p>{t('If we change this policy we publish the new version here and update the date at the top. For important changes we will also email our members.', 'Se modifichiamo questa informativa pubblichiamo qui la nuova versione e aggiorniamo la data in alto. Per le modifiche importanti scriveremo anche via email ai nostri iscritti.')}</p>
      </div>
    </LegalPage>
  )
}
