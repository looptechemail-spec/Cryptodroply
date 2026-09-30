import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contact', description: 'Write to Cryptodroply: questions, project listings and collaborations.' }

export default async function Contact({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams
  return (
    <div className="container">
      <div className="page-head">
        <h1>Contact</h1>
        <p style={{ fontSize: 20, maxWidth: 640 }}>Questions, a project you want listed or an idea to work together. We read every message.</p>
      </div>
      <div className="auth-card" style={{ margin: '24px 0 96px', maxWidth: 640 }}>
        {sent && <div className="auth-ok">Thank you. Your message was sent and we will reply by email.</div>}
        {error && <div className="auth-error">Check your email and write a message of a few words.</div>}
        <form method="post" action="/api/contact" className="auth-form contact-form">
          <label htmlFor="topic">What is it about?</label>
          <select id="topic" name="topic" defaultValue="contact">
            <option value="contact">A question</option>
            <option value="project">List my project</option>
            <option value="collab">A collaboration</option>
          </select>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" autoComplete="name" />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" rows={6} required />
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
          <button className="btn btn-blue" type="submit">
            Send message
          </button>
        </form>
      </div>
    </div>
  )
}
