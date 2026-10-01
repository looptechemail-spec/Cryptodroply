import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminMessages() {
  await requireAdmin()
  const rows = await db.formSubmission.findMany({ orderBy: [{ handled: 'asc' }, { createdAt: 'desc' }], take: 200 })
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Messages</h1>
      <AdminNav />
      <table className="admin-table">
        <thead><tr><th>Date</th><th>From</th><th>Message</th><th></th></tr></thead>
        <tbody>
          {rows.map((m) => {
            const p = m.payload as Record<string, unknown>
            return (
              <tr key={m.id} style={{ opacity: m.handled ? 0.5 : 1 }}>
                <td>{m.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                <td>{m.email}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{Object.entries(p).map(([k, v]) => `${k}: ${v}`).join('\n')}</td>
                <td>
                  {!m.handled && (
                    <form method="post" action="/api/admin/messages">
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn btn-outline-dark btn-sm" type="submit">Done</button>
                    </form>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
