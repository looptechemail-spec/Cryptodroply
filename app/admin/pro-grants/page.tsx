import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { grantAndNotify, parseEmails, DEFAULT_SUBJECT, DEFAULT_BODY, INITIAL_GRANTS } from '@/lib/pro-grants'

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
    msg = `PRO access granted to ${r.granted} emails. Email sent to ${r.sent}.${r.failed.length ? ' ERROR not sent to: ' + r.failed.join(', ') : ''}`
  } catch (e) { msg = `ERROR: ${(e as Error).message}` }
  revalidatePath('/admin/pro-grants')
  redirect(`/admin/pro-grants?msg=${encodeURIComponent(msg.slice(0, 400))}`)
}

async function remove(fd: FormData) {
  'use server'
  await requireAdmin()
  await db.proGrant.deleteMany({ where: { email: String(fd.get('email')) } })
  revalidatePath('/admin/pro-grants')
  redirect('/admin/pro-grants?msg=' + encodeURIComponent('Access removed'))
}

export default async function ProGrants({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin()
  const sp = await searchParams
  const grants = await db.proGrant.findMany({ orderBy: { createdAt: 'asc' } })
  const users = await db.user.findMany({ where: { email: { in: grants.map((g) => g.email) } }, select: { email: true } })
  const registered = new Set(users.map((u) => u.email.toLowerCase()))
  const pending = grants.filter((g) => !g.notifiedAt).map((g) => g.email)
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>PRO access for old customers</h1>
      <AdminNav />
      {sp.msg && <div style={{ background: /error/i.test(sp.msg) ? '#fde8ea' : '#e6f6ea', borderRadius: 12, padding: '12px 16px', margin: '12px 0', fontWeight: 600 }}>{sp.msg}</div>}
      <p>For customers who still pay on Wix. The PRO access works as soon as they register (or log in) on the new site with the same email. Payments stay on Wix.</p>
      <form action={send} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-1)' }}>
        <label><b>Emails</b> (one per line; whoever already got the email is not written to again)</label>
        <textarea name="emails" rows={7} defaultValue={(pending.length ? pending : INITIAL_GRANTS.filter((e) => !grants.some((g) => g.email === e && g.notifiedAt))).join('\n')} style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <label><b>Subject</b></label>
        <input name="subject" defaultValue={DEFAULT_SUBJECT} style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <label><b>Text</b> (English and Italian; the button to sign up is added)</label>
        <textarea name="body" rows={14} defaultValue={DEFAULT_BODY} style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <button className="btn btn-yellow btn-sm">Grant PRO and send the email</button>
      </form>
      <h2>Granted ({grants.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Email</th><th align="left">Registered on the new site</th><th align="left">Email sent</th><th /></tr></thead>
        <tbody>
          {grants.map((g) => (
            <tr key={g.id}>
              <td>{g.email}</td>
              <td>{registered.has(g.email) ? 'Yes' : 'Not yet'}</td>
              <td>{g.notifiedAt ? g.notifiedAt.toISOString().slice(0, 16).replace('T', ' ') : 'No'}</td>
              <td><form action={remove}><input type="hidden" name="email" value={g.email} /><button className="btn btn-sm">Remove</button></form></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
