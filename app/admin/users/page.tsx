import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminUsers() {
  await requireAdmin()
  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 500, include: { subscription: true } })
  const d = (x?: Date | null) => (x ? x.toISOString().slice(0, 10) : '')
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Utenti ({users.length})</h1>
      <AdminNav />
      <table className="admin-table">
        <thead><tr><th>Email</th><th>Nome</th><th>Piano</th><th>Rinnovo / scadenza</th><th>Iscritto il</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}{u.role === 'ADMIN' ? ' (admin)' : ''}</td>
              <td>{u.name}</td>
              <td>{u.subscription ? `${u.subscription.status}${u.subscription.cancelAtPeriodEnd ? ' (in disdetta)' : ''}` : 'Gratuito'}</td>
              <td>{d(u.subscription?.currentPeriodEnd)}</td>
              <td>{d(u.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
