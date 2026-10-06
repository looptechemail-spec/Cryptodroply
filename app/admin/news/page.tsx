import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { SocialList } from '@/components/SocialList'
import { findNews, newsFromText, sendAll, deleteAllDrafts } from '@/lib/social-actions'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export default async function News({ searchParams }: { searchParams: Promise<{ v?: string; msg?: string }> }) {
  await requireAdmin()
  const sp = await searchParams
  const view = sp.v === 'sent' ? 'sent' : 'review'
  const runs = await db.jobRun.findMany({ where: { OR: [{ key: { startsWith: 'manual-news' } }, { key: { startsWith: 'social-' } }] }, orderBy: { ranAt: 'desc' }, take: 5 })
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Post di news</h1>
      <AdminNav />
      {sp.msg && <div style={{ background: /error/i.test(sp.msg) ? '#fde8ea' : '#e6f6ea', borderRadius: 12, padding: '12px 16px', margin: '12px 0', fontWeight: 600 }}>{sp.msg}</div>}
      <p>
        Ogni giorno il sito cerca le notizie crypto più utili delle ultime 24 ore e scrive i post per X, Telegram e Facebook.
        Oppure incolla tu un testo o un link e scrive i post. Tutto va su Publer solo quando lo decidi tu.
      </p>
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
        <form action={findNews} style={{ marginBottom: 14 }}>
          <button className="btn btn-yellow btn-sm">Cerca le news di oggi e scrivi i post (richiede da 1 a 2 minuti)</button>
        </form>
        <form action={newsFromText.bind(null, 'draft')}>
          <textarea name="content" rows={4} placeholder="Incolla qui un testo o un link" style={{ width: '100%', padding: 10 }} required />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <label>Data e ora (Roma, servono per programmare) <input type="datetime-local" name="when" /></label>
            <button formAction={newsFromText.bind(null, 'now')} className="btn btn-blue btn-sm">Pubblica ora su X, Telegram e Facebook</button>
            <button formAction={newsFromText.bind(null, 'schedule')} className="btn btn-yellow btn-sm">Programma su tutti e tre (scegli la data)</button>
            <button formAction={newsFromText.bind(null, 'draft')} className="btn btn-sm">Scrivi solo le bozze</button>
          </div>
        </form>
        <form action={sendAll.bind(null, 'draft')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <input type="hidden" name="source" value="news" />
          <button formAction={sendAll.bind(null, 'draft')} className="btn btn-sm">Manda tutto quello che c’è sotto a Publer come bozze</button>
        </form>
      </div>
      <form action={deleteAllDrafts.bind(null, 'news')} style={{ marginBottom: 12 }}><button className="btn btn-sm">Elimina tutte le bozze qui sotto</button></form>
      {runs.length > 0 && <ul>{runs.map((r) => <li key={r.key}>{r.ranAt.toISOString().slice(0, 16).replace('T', ' ')}: {r.note ?? ''}</li>)}</ul>}
      <p>
        <a href="?v=review" style={{ marginRight: 16, fontWeight: view === 'review' ? 800 : 400 }}>Da rivedere</a>
        <a href="?v=sent" style={{ fontWeight: view === 'sent' ? 800 : 400 }}>Su Publer</a>
      </p>
      <SocialList source="news" view={view} />
    </div>
  )
}
