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
      <p>{active} confermati, {pending} in attesa di conferma. <a href="/api/admin/subscribers">Scarica CSV (confermati)</a></p>
      <table className="admin-table">
        <thead><tr><th>Email</th><th>Lingua</th><th>Origine</th><th>Stato</th><th>Iscritto il</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>{s.email}</td><td>{s.locale}</td><td>{s.source}</td>
              <td>{s.unsubscribedAt ? 'Disiscritto' : s.confirmedAt ? 'Confermato' : 'In attesa'}</td>
              <td>{d(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
