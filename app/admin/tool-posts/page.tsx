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
      <h1>Tool posts</h1>
      <AdminNav />
      {sp.msg && <div style={{ background: /error/i.test(sp.msg) ? '#fde8ea' : '#e6f6ea', borderRadius: 12, padding: '12px 16px', margin: '12px 0', fontWeight: 600 }}>{sp.msg}</div>}
      <p>
        One tool or article per day on X, Telegram and Facebook, at 10:00. Every Friday from 09:00 the next week is prepared on its own and lands on Publer as drafts.
        You can also prepare a week now, or upload a Publer CSV.
      </p>
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
        <form action={prepareWeek} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input name="monday" placeholder="Monday YYYY-MM-DD (empty = next week)" style={{ padding: 8, minWidth: 280 }} />
          <button className="btn btn-yellow btn-sm">Prepare the week on Publer (takes about a minute)</button>
        </form>
        <form action={importCsv} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input type="file" name="file" accept=".csv" required />
          <button className="btn btn-sm">Import a Publer CSV</button>
        </form>
        <form action={sendAll.bind(null, 'draft')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="hidden" name="source" value="tool" />
          <button formAction={sendAll.bind(null, 'draft')} className="btn btn-blue btn-sm">Send everything below to Publer as drafts</button>
          <button formAction={sendAll.bind(null, 'scheduled')} className="btn btn-sm">Schedule everything below on Publer</button>
        </form>
      </div>
      <form action={deleteAllDrafts.bind(null, 'tool')} style={{ marginBottom: 12 }}><button className="btn btn-sm">Delete all drafts below</button></form>
      {runs.length > 0 && <ul>{runs.map((r) => <li key={r.key}>{r.ranAt.toISOString().slice(0, 16).replace('T', ' ')}: {r.note}</li>)}</ul>}
      <p>
        <a href="?v=review" style={{ marginRight: 16, fontWeight: view === 'review' ? 800 : 400 }}>To review</a>
        <a href="?v=sent" style={{ fontWeight: view === 'sent' ? 800 : 400 }}>On Publer</a>
      </p>
      <SocialList source="tool" view={view} />
    </div>
  )
}
