import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { agentToken, ownerChat } from '@/lib/tgbot'
import { dateToRome } from '@/lib/time'

export const dynamic = 'force-dynamic'

const COLORS: Record<string, string> = { DONE: '#1a7f37', FAILED: '#c0392b', PROPOSED: '#b7791f', QUEUED: '#3C53F4', REJECTED: '#777', INFO: '#555', RUNNING: '#b7791f' }

export default async function Page() {
  await requireAdmin()
  const rows = await db.agentTask.findMany({ orderBy: { createdAt: 'desc' }, take: 80 })
  const linked = Boolean(await ownerChat())
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Agente Telegram</h1>
      <AdminNav />
      <p>Bot: <b>{agentToken() ? 'configurato' : 'non configurato (manca TELEGRAM_AGENT_TOKEN)'}</b> · Chat: <b>{linked ? 'collegata' : 'da collegare: scrivi /start e la password admin al bot'}</b></p>
      <table className="admin-table">
        <thead><tr><th>Quando</th><th>Stato</th><th>Chi</th><th>Cosa</th><th>Esito</th></tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{dateToRome(t.createdAt).replace('T', ' ')}</td>
              <td style={{ color: COLORS[t.status] ?? '#000', fontWeight: 800 }}>{t.status}</td>
              <td>{t.source}</td>
              <td style={{ whiteSpace: 'pre-wrap' }}>{t.title}</td>
              <td style={{ whiteSpace: 'pre-wrap' }}>{t.result ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
