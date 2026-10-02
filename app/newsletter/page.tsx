import Link from '@/components/LocLink'
import type { Metadata } from 'next'
import { i18n } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Newsletter', robots: { index: false } }

const MESSAGES: Record<string, [string, string]> = {
  pending: ['Check your inbox', 'We sent you an email. Click the button inside to confirm your subscription.'],
  already: ['You are already subscribed', 'Nothing else to do. New tools and guides will reach your inbox.'],
  confirmed: ['You are subscribed', 'Thank you. You will get new tools, airdrops and guides from Cryptodroply.'],
  unsubscribed: ['You are unsubscribed', 'You will not receive our emails any more.'],
  invalid: ['That did not work', 'The link is not valid or has expired. Please subscribe again from the footer.'],
}
const MESSAGES_IT: Record<string, [string, string]> = {
  pending: ['Controlla la tua casella', 'Ti abbiamo inviato un\'email. Clicca sul pulsante al suo interno per confermare l\'iscrizione.'],
  already: ['Sei già iscritto', 'Non c\'è altro da fare. Nuovi strumenti e guide arriveranno nella tua casella.'],
  confirmed: ['Sei iscritto', 'Grazie. Riceverai nuovi strumenti, airdrop e guide da Cryptodroply.'],
  unsubscribed: ['Ti sei disiscritto', 'Non riceverai più le nostre email.'],
  invalid: ['Non ha funzionato', 'Il link non è valido o è scaduto. Iscriviti di nuovo dal footer.'],
}

export default async function NewsletterStatus({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const { t, it } = await i18n()
  const msgs = it ? MESSAGES_IT : MESSAGES
  const [title, text] = msgs[status ?? ''] ?? msgs.invalid
  return (
    <div className="container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>{title}</h1>
        <p className="auth-sub">{text}</p>
        <p style={{ marginTop: 24 }}>
          <Link href="/" className="btn btn-blue">
            {t('Back to the site', 'Torna al sito')}
          </Link>
        </p>
      </div>
    </div>
  )
}
