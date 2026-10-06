import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { SocialList } from '@/components/SocialList'
import { importCsv, prepareWeek, sendAll, deleteAllDrafts } from '@/lib/social-actions'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export default async function ToolPosts({ searchParams }: { searchParams: Promise<{ v?: string; msg?: string }> }) {
  await requireAdmin()
  const sp = await searchParams
  const view = sp.v === 'sent' ? 'sent' : 'review'
  const runs = await db.jobRun.findMany({ where: { OR: [{ key: { startsWith: 'manual-week' } }, { key: { startsWith: 'manual-csv' } }, { key: { startsWith: 'weekplan' } }] }, orderBy: { ranAt: 'desc' }, take: 5 })
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Post sugli strumenti</h1>
      <AdminNav />
      {sp.msg && <div style={{ background: /error/i.test(sp.msg) ? '#fde8ea' : '#e6f6ea', borderRadius: 12, padding: '12px 16px', margin: '12px 0', fontWeight: 600 }}>{sp.msg}</div>}
      <p>
        Uno strumento o un articolo al giorno su X, Telegram e Facebook, alle 10:00. Ogni venerdì dalle 09:00 la settimana successiva si prepara da sola e arriva su Publer come bozze.
        Puoi anche preparare una settimana adesso, oppure caricare un CSV di Publer.
      </p>
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
        <form action={prepareWeek} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input name="monday" placeholder="Lunedì AAAA-MM-GG (vuoto = prossima settimana)" style={{ padding: 8, minWidth: 280 }} />
          <button className="btn btn-yellow btn-sm">Prepara la settimana su Publer (richiede circa un minuto)</button>
        </form>
        <form action={importCsv} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input type="file" name="file" accept=".csv" required />
          <button className="btn btn-sm">Importa un CSV di Publer</button>
        </form>
        <form action={sendAll.bind(null, 'draft')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="hidden" name="source" value="tool" />
          <button formAction={sendAll.bind(null, 'draft')} className="btn btn-blue btn-sm">Manda tutto quello che c’è sotto a Publer come bozze</button>
          <button formAction={sendAll.bind(null, 'scheduled')} className="btn btn-sm">Programma tutto quello che c’è sotto su Publer</button>
        </form>
      </div>
      <form action={deleteAllDrafts.bind(null, 'tool')} style={{ marginBottom: 12 }}><button className="btn btn-sm">Elimina tutte le bozze qui sotto</button></form>
      {runs.length > 0 && <ul>{runs.map((r) => <li key={r.key}>{r.ranAt.toISOString().slice(0, 16).replace('T', ' ')}: {r.note}</li>)}</ul>}
      <p>
        <a href="?v=review" style={{ marginRight: 16, fontWeight: view === 'review' ? 800 : 400 }}>Da rivedere</a>
        <a href="?v=sent" style={{ fontWeight: view === 'sent' ? 800 : 400 }}>Su Publer</a>
      </p>
      <SocialList source="tool" view={view} />
    </div>
  )
}
