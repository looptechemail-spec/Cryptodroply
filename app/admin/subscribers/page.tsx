import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminSubscribers() {
  await requireAdmin()
  const [rows, active, pending] = await Promise.all([
    db.subscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }),
    db.subscriber.count({ where: { confirmedAt: { not: null }, unsubscribedAt: null } }),
    db.subscriber.count({ where: { confirmedAt: null, unsubscribedAt: null } }),
  ])
  const d = (x?: Date | null) => (x ? x.toISOString().slice(0, 10) : '')
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Newsletter</h1>
      <AdminNav />
      <p>{active} confirmed, {pending} waiting for confirmation. <a href="/api/admin/subscribers">Download CSV (confirmed)</a></p>
      <table className="admin-table">
        <thead><tr><th>Email</th><th>Language</th><th>Source</th><th>Status</th><th>Joined</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>{s.email}</td><td>{s.locale}</td><td>{s.source}</td>
              <td>{s.unsubscribedAt ? 'Unsubscribed' : s.confirmedAt ? 'Confirmed' : 'Pending'}</td>
              <td>{d(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
