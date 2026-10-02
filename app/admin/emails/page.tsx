import Link from 'next/link'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { FLOWS } from '@/lib/email-flows'
import { toggleFlow } from '@/lib/email-actions'

export const dynamic = 'force-dynamic'

export default async function AdminEmails() {
  await requireAdmin()
  const rows = await db.emailFlow.findMany().catch(() => [])
  const off = new Set(rows.filter((r) => !r.enabled).map((r) => r.key))
  const groups = [...new Set(FLOWS.map((f) => f.group))]
  const ready = !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Emails</h1>
      <AdminNav />
      <p>
        All automatic emails of the site. Sender: <b>{process.env.EMAIL_FROM ?? 'not set'}</b>.
        {ready ? ' Sending is on.' : ' Sending is OFF: RESEND_API_KEY or EMAIL_FROM is missing.'} Open one to see the full email and send yourself a test.
        The weekly digest is managed in <Link href="/admin/newsletter">Campaigns</Link>.
      </p>
      {groups.map((g) => (
        <section key={g} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 10px' }}>{g}</h2>
          <table className="admin-table">
            <thead><tr><th>Email</th><th>When it is sent</th><th>To</th><th>Switch</th></tr></thead>
            <tbody>
              {FLOWS.filter((f) => f.group === g).map((f) => {
                const on = !off.has(f.key)
                return (
                  <tr key={f.key} style={{ opacity: on ? 1 : 0.55 }}>
                    <td><Link href={`/admin/emails/${f.key}`}><b>{f.name}</b></Link><br /><Link href={`/admin/emails/${f.key}`} style={{ fontSize: 13 }}>Preview and test</Link></td>
                    <td>{f.when}</td>
                    <td>{f.to}</td>
                    <td>
                      <form action={toggleFlow}>
                        <input type="hidden" name="key" value={f.key} />
                        <input type="hidden" name="enabled" value={on ? '0' : '1'} />
                        <button className={on ? 'btn btn-blue btn-sm' : 'btn btn-outline-dark btn-sm'} type="submit">{on ? 'ON' : 'OFF'}</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
