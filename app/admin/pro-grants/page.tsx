import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { wixPayments, grantAndNotify, parseEmails, DEFAULT_SUBJECT, DEFAULT_BODY, INITIAL_GRANTS } from '@/lib/pro-grants'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function send(fd: FormData) {
  'use server'
  await requireAdmin()
  let msg: string
  try {
    const emails = parseEmails(String(fd.get('emails') ?? ''))
    const subject = String(fd.get('subject') ?? '').trim()
    const body = String(fd.get('body') ?? '')
    if (!emails.length) throw new Error('Nessuna email valida')
    if (!subject || !body.trim()) throw new Error('Oggetto e testo sono obbligatori')
    const r = await grantAndNotify(emails, subject, body)
    msg = `Accesso PRO concesso a ${r.granted} email. Email inviata a ${r.sent}.${r.failed.length ? ' ERRORE: non inviata a: ' + r.failed.join(', ') : ''}`
  } catch (e) { msg = `ERRORE: ${(e as Error).message}` }
  revalidatePath('/admin/pro-grants')
  redirect(`/admin/pro-grants?msg=${encodeURIComponent(msg.slice(0, 400))}`)
}

async function remove(fd: FormData) {
  'use server'
  await requireAdmin()
  await db.proGrant.deleteMany({ where: { email: String(fd.get('email')) } })
  revalidatePath('/admin/pro-grants')
  redirect('/admin/pro-grants?msg=' + encodeURIComponent('Accesso rimosso'))
}

export default async function ProGrants({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin()
  const sp = await searchParams
  const grants = await db.proGrant.findMany({ orderBy: { createdAt: 'asc' } })
  const users = await db.user.findMany({ where: { email: { in: grants.map((g) => g.email) } }, select: { email: true } })
  const registered = new Set(users.map((u) => u.email.toLowerCase()))
  const pay = await wixPayments(grants.map((g) => g.email))
  const wixSite = process.env.WIX_SITE_ID
  const pending = grants.filter((g) => !g.notifiedAt).map((g) => g.email)
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Accesso PRO per i vecchi clienti</h1>
      <AdminNav />
      {sp.msg && <div style={{ background: /error/i.test(sp.msg) ? '#fde8ea' : '#e6f6ea', borderRadius: 12, padding: '12px 16px', margin: '12px 0', fontWeight: 600 }}>{sp.msg}</div>}
      <p>Per i clienti che pagano ancora su Wix. L’accesso PRO funziona appena si registrano (o accedono) sul nuovo sito con la stessa email. I pagamenti restano su Wix.</p>
      <form action={send} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-1)' }}>
        <label><b>Email</b> (una per riga; chi ha già ricevuto l’email non viene ricontattato)</label>
        <textarea name="emails" rows={7} defaultValue={(pending.length ? pending : INITIAL_GRANTS.filter((e) => !grants.some((g) => g.email === e && g.notifiedAt))).join('\n')} style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <label><b>Oggetto</b></label>
        <input name="subject" defaultValue={DEFAULT_SUBJECT} style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <label><b>Testo</b> (in inglese; il pulsante di registrazione viene aggiunto da solo)</label>
        <textarea name="body" rows={14} defaultValue={DEFAULT_BODY} style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <button className="btn btn-yellow btn-sm">Concedi PRO e invia l’email</button>
      </form>
      <h2>Accessi concessi ({grants.length})</h2>
      <p>
        {wixSite && <a href={`https://manage.wix.com/dashboard/${wixSite}`} target="_blank" rel="noreferrer">Apri la dashboard di Wix</a>}
        {wixSite && ' · '}<a href="https://dashboard.stripe.com/subscriptions" target="_blank" rel="noreferrer">Apri gli abbonamenti su Stripe</a>
        {pay.error && <span style={{ color: '#b00020' }}> · Stato Wix non disponibile: {pay.error}</span>}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Email</th><th align="left">Registrato sul nuovo sito</th><th align="left">Email inviata</th><th align="left">Pagamento su Wix</th><th /></tr></thead>
        <tbody>
          {grants.map((g) => (
            <tr key={g.id}>
              <td>{g.email}</td>
              <td>{registered.has(g.email) ? 'Sì' : 'Non ancora'}</td>
              <td>{g.notifiedAt ? g.notifiedAt.toISOString().slice(0, 16).replace('T', ' ') : 'No'}</td>
              <td>{pay.map.get(g.email)?.join(' | ') ?? (pay.error ? '?' : 'Nessun piano trovato')} · <a href={`https://dashboard.stripe.com/search?query=${encodeURIComponent(g.email)}`} target="_blank" rel="noreferrer">Stripe</a></td>
              <td><form action={remove}><input type="hidden" name="email" value={g.email} /><button className="btn btn-sm">Rimuovi</button></form></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
