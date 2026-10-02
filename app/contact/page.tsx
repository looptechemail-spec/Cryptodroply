import type { Metadata } from 'next'
import { i18n } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Contact', 'Contatti'),
    description: t('Write to Cryptodroply: questions, project listings and collaborations.', 'Scrivi a Cryptodroply: domande, inserimento di progetti e collaborazioni.'),
  }
}

export default async function Contact({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams
  const { t } = await i18n()
  return (
    <div className="container">
      <div className="page-head">
        <h1>{t('Contact', 'Contatti')}</h1>
        <p style={{ fontSize: 20, maxWidth: 640 }}>{t('Questions, a project you want listed or an idea to work together. We read every message.', 'Domande, un progetto che vuoi inserire o un\'idea per collaborare. Leggiamo ogni messaggio.')}</p>
      </div>
      <div className="auth-card" style={{ margin: '24px 0 96px', maxWidth: 640 }}>
        {sent && <div className="auth-ok">{t('Thank you. Your message was sent and we will reply by email.', 'Grazie. Il tuo messaggio è stato inviato e ti risponderemo via email.')}</div>}
        {error && <div className="auth-error">{t('Check your email and write a message of a few words.', 'Controlla la tua email e scrivi un messaggio di qualche parola.')}</div>}
        <form method="post" action="/api/contact" className="auth-form contact-form">
          <label htmlFor="topic">{t('What is it about?', 'Di cosa si tratta?')}</label>
          <select id="topic" name="topic" defaultValue="contact">
            <option value="contact">{t('A question', 'Una domanda')}</option>
            <option value="project">{t('List my project', 'Inserisci il mio progetto')}</option>
            <option value="collab">{t('A collaboration', 'Una collaborazione')}</option>
          </select>
          <label htmlFor="name">{t('Name', 'Nome')}</label>
          <input id="name" name="name" autoComplete="name" />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="message">{t('Message', 'Messaggio')}</label>
          <textarea id="message" name="message" rows={6} required />
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
          <button className="btn btn-blue" type="submit">
            {t('Send message', 'Invia messaggio')}
          </button>
        </form>
      </div>
    </div>
  )
}
