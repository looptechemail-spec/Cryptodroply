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
      <h1>Tools ({tools.length})</h1>
      <AdminNav />
      <form className="row-form" style={{ marginBottom: 20 }}>
        <label>Search<input name="q" defaultValue={q} /></label>
        <label>Category
          <select name="c" defaultValue={c ?? ''} style={{ padding: 12, borderRadius: 14, border: '2px solid var(--line)' }}>
            <option value="">All</option>
            {cats.map((x) => <option key={x.id} value={x.slug}>{x.slug} ({x._count.tools})</option>)}
          </select>
        </label>
        <button className="btn btn-blue" type="submit">Filter</button>
      </form>
      <table className="admin-table">
        <thead><tr><th>Tool</th><th>Category</th><th>Status</th><th>Affiliate link</th><th></th></tr></thead>
        <tbody>
          {tools.map((t) => (
            <tr key={t.id}>
              <td>{t.title}{t.featured ? ' ★' : ''}</td>
              <td>{t.category.slug}</td>
              <td>{t.status}</td>
              <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.refLink ?? '—'}</td>
              <td><Link href={`/admin/tools/${t.id}`}>Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
