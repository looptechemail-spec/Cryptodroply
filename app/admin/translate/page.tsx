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
      <h1>Italian translation</h1>
      <AdminNav />
      {msg && <p className="notice">{msg}</p>}
      <p>Tools and articles are translated to Italian automatically in the background (new ones every hour). English is never changed. Pages in /it show the Italian text when it exists and the English text otherwise.</p>
      <table className="admin-table">
        <thead><tr><th>Content</th><th>Translated</th><th>Total</th></tr></thead>
        <tbody>
          <tr><td>Tools</td><td>{c.toolsIt}</td><td>{c.tools}</td></tr>
          <tr><td>Articles</td><td>{c.postsIt}</td><td>{c.posts}</td></tr>
        </tbody>
      </table>
      <p style={{ opacity: 0.8 }}>{busy ? 'A translation is running now. Reload this page in a minute.' : c.last ? `Last run: ${c.last.ranAt.toISOString().slice(0, 16).replace('T', ' ')} UTC, ${c.last.note ?? ''}` : 'No run yet.'}</p>
      <form action={startTranslation}>
        <button type="submit" className="btn btn-blue btn-sm" disabled={busy}>Translate what is missing</button>
      </form>
    </div>
  )
}
