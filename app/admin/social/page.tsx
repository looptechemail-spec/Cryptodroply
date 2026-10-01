import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

async function save(fd: FormData) {
  'use server'
  await requireAdmin()
  const when = String(fd.get('scheduledAt') ?? '')
  const act = String(fd.get('act'))
  await db.socialPost.update({
    where: { id: String(fd.get('id')) },
    data: {
      text: String(fd.get('text')),
      scheduledAt: when ? new Date(when) : null,
      ...(act === 'approve' ? { status: 'APPROVED' } : act === 'reject' ? { status: 'REJECTED' } : act === 'draft' ? { status: 'DRAFT' } : {}),
    },
  })
  revalidatePath('/admin/social')
}

const TABS = ['DRAFT', 'APPROVED', 'SENT', 'REJECTED']

export default async function AdminSocial({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireAdmin()
  const s = TABS.includes((await searchParams).s ?? '') ? (await searchParams).s! : 'DRAFT'
  const rows = await db.socialPost.findMany({ where: { status: s }, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 100 })
  const local = (d?: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Social posts</h1>
      <AdminNav />
      <p>{TABS.map((t) => <a key={t} href={`?s=${t}`} style={{ marginRight: 16, fontWeight: t === s ? 800 : 400 }}>{t}</a>)}</p>
      {rows.length === 0 && <p>Nothing here.</p>}
      {rows.map((r) => (
        <form key={r.id} action={save} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
          <input type="hidden" name="id" value={r.id} />
          <b>{r.channel}</b> {r.linkUrl && <a href={r.linkUrl} target="_blank" rel="noreferrer">link</a>} {r.imageUrl && <a href={r.imageUrl} target="_blank" rel="noreferrer">image</a>}
          <textarea name="text" defaultValue={r.text} rows={5} style={{ width: '100%', padding: 10, margin: '10px 0' }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>Publish at <input type="datetime-local" name="scheduledAt" defaultValue={local(r.scheduledAt)} /></label>
            <button name="act" value="save" className="btn btn-sm">Save</button>
            {r.status !== 'APPROVED' && r.status !== 'SENT' && <button name="act" value="approve" className="btn btn-yellow btn-sm">Approve</button>}
            {r.status === 'APPROVED' && <button name="act" value="draft" className="btn btn-sm">Back to draft</button>}
            {r.status === 'DRAFT' && <button name="act" value="reject" className="btn btn-sm">Reject</button>}
          </div>
        </form>
      ))}
    </div>
  )
}
