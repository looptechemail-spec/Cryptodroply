import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function EditTool({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const t = await db.tool.findUnique({ where: { id }, include: { category: true, translations: true } })
  if (!t) notFound()
  const en = t.translations.find((x) => x.locale === 'EN')
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>{t.title}</h1>
      <AdminNav />
      <form method="post" action={`/api/admin/tools/${t.id}`} className="auth-form" style={{ maxWidth: 720, background: '#fff', padding: 28, borderRadius: 24 }}>
        <label>Title<input name="title" defaultValue={t.title} required /></label>
        <label>Short description<input name="description" defaultValue={en?.description ?? ''} /></label>
        <label>Affiliate link<input name="refLink" defaultValue={t.refLink ?? ''} /></label>
        <label>Website<input name="websiteUrl" defaultValue={t.websiteUrl ?? ''} /></label>
        <label>Logo URL<input name="logoUrl" defaultValue={t.logoUrl ?? ''} /></label>
        <label>Status
          <select name="status" defaultValue={t.status} style={{ padding: 12, borderRadius: 14, border: '2px solid var(--line)' }}>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </label>
        <label style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><input type="checkbox" name="featured" defaultChecked={t.featured} style={{ width: 20 }} /> Featured (Editor&apos;s picks)</label>
        <label style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><input type="checkbox" name="sponsored" defaultChecked={t.sponsored} style={{ width: 20 }} /> Sponsored</label>
        <button className="btn btn-blue" type="submit">Save</button>
      </form>
    </div>
  )
}
