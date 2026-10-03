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
      <h1>News posts</h1>
      <AdminNav />
      {sp.msg && <div style={{ background: /error/i.test(sp.msg) ? '#fde8ea' : '#e6f6ea', borderRadius: 12, padding: '12px 16px', margin: '12px 0', fontWeight: 600 }}>{sp.msg}</div>}
      <p>
        Every day the site looks for the most useful crypto news of the last 24 hours and writes posts for X, Telegram and Facebook.
        Or paste a text or a link yourself and it writes the posts. Everything goes to Publer when you say so.
      </p>
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
        <form action={findNews} style={{ marginBottom: 14 }}>
          <button className="btn btn-yellow btn-sm">Find today&apos;s news and write posts (takes 1 to 2 minutes)</button>
        </form>
        <form action={newsFromText}>
          <textarea name="content" rows={4} placeholder="Paste a text or a link here" style={{ width: '100%', padding: 10 }} required />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
            <label>Date and time (Rome, empty = tomorrow 12:00) <input type="datetime-local" name="when" /></label>
            <button className="btn btn-blue btn-sm">Write the posts</button>
          </div>
        </form>
        <form action={sendAll.bind(null, 'draft')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <input type="hidden" name="source" value="news" />
          <button formAction={sendAll.bind(null, 'draft')} className="btn btn-sm">Send everything below to Publer as drafts</button>
        </form>
      </div>
      <form action={deleteAllDrafts.bind(null, 'news')} style={{ marginBottom: 12 }}><button className="btn btn-sm">Delete all drafts below</button></form>
      {runs.length > 0 && <ul>{runs.map((r) => <li key={r.key}>{r.ranAt.toISOString().slice(0, 16).replace('T', ' ')}: {r.note ?? ''}</li>)}</ul>}
      <p>
        <a href="?v=review" style={{ marginRight: 16, fontWeight: view === 'review' ? 800 : 400 }}>To review</a>
        <a href="?v=sent" style={{ fontWeight: view === 'sent' ? 800 : 400 }}>On Publer</a>
      </p>
      <SocialList source="news" view={view} />
    </div>
  )
}
