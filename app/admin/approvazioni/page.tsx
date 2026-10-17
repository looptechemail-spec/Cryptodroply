import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { ApprovalQueue } from '@/components/ApprovalQueue'

export const dynamic = 'force-dynamic'

export default async function Approvazioni({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin()
  const { msg } = await searchParams
  return (
    <div className="container">
      <div className="page-head"><h1 style={{ fontSize: 44 }}>Approvazioni</h1></div>
      <AdminNav />
      {msg && <p style={{ background: msg.startsWith('ERRORE') ? '#fde8ea' : 'var(--tint)', padding: '10px 16px', borderRadius: 12, fontWeight: 700 }}>{msg}</p>}
      <p style={{ color: 'var(--muted)' }}>Tutto ciò che aspetta il tuo OK: articoli, analisi PRO, post social, newsletter e proposte dell’agente.</p>
      <ApprovalQueue />
      <div style={{ height: 72 }} />
    </div>
  )
}
