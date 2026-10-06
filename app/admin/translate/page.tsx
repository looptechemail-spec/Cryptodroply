import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { translationCounts, translating } from '@/lib/translate'
import { startTranslation } from '@/lib/translate-actions'

export const dynamic = 'force-dynamic'

export default async function AdminTranslate({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin()
  const { msg } = await searchParams
  const c = await translationCounts()
  const busy = translating()
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Traduzione in italiano</h1>
      <AdminNav />
      {msg && <p className="notice">{msg}</p>}
      <p>Strumenti e articoli vengono tradotti in italiano in automatico, in secondo piano (quelli nuovi ogni ora). L’inglese non viene mai modificato. Le pagine in /it mostrano il testo italiano quando esiste, altrimenti quello inglese.</p>
      <table className="admin-table">
        <thead><tr><th>Contenuto</th><th>Tradotti</th><th>Totale</th></tr></thead>
        <tbody>
          <tr><td>Strumenti</td><td>{c.toolsIt}</td><td>{c.tools}</td></tr>
          <tr><td>Articoli</td><td>{c.postsIt}</td><td>{c.posts}</td></tr>
        </tbody>
      </table>
      <p style={{ opacity: 0.8 }}>{busy ? 'Una traduzione è in corso. Ricarica la pagina tra un minuto.' : c.last ? `Ultima esecuzione: ${c.last.ranAt.toISOString().slice(0, 16).replace('T', ' ')} UTC, ${c.last.note ?? ''}` : 'Nessuna esecuzione finora.'}</p>
      <form action={startTranslation}>
        <button type="submit" className="btn btn-blue btn-sm" disabled={busy}>Traduci quello che manca</button>
      </form>
    </div>
  )
}
