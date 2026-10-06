import Link from 'next/link'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminTools({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  await requireAdmin()
  const { q, c } = await searchParams
  const [tools, cats] = await Promise.all([
    db.tool.findMany({
      where: { ...(c ? { category: { slug: c } } : {}), ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }], take: 400, include: { category: true },
    }),
    db.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { tools: true } } } }),
  ])
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Strumenti ({tools.length})</h1>
      <AdminNav />
      <form className="row-form" style={{ marginBottom: 20 }}>
        <label>Cerca<input name="q" defaultValue={q} /></label>
        <label>Categoria
          <select name="c" defaultValue={c ?? ''} style={{ padding: 12, borderRadius: 14, border: '2px solid var(--line)' }}>
            <option value="">Tutte</option>
            {cats.map((x) => <option key={x.id} value={x.slug}>{x.slug} ({x._count.tools})</option>)}
          </select>
        </label>
        <button className="btn btn-blue" type="submit">Filtra</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Strumento</th><th>Categoria</th><th>Stato</th><th>Link di affiliazione</th><th></th></tr></thead>
        <tbody>
          {tools.map((t) => (
            <tr key={t.id}>
              <td>{t.title}{t.featured ? ' ★' : ''}</td>
              <td>{t.category.slug}</td>
              <td>{t.status}</td>
              <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.refLink ?? '—'}</td>
              <td><Link href={`/admin/tools/${t.id}`}>Modifica</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
