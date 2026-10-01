import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { mainList, sendCampaign, sendTest, buildDigest } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

async function send(fd: FormData) {
  'use server'
  await requireAdmin()
  await sendCampaign(String(fd.get('id')))
  revalidatePath('/admin/newsletter')
}
async function test(fd: FormData) {
  'use server'
  await requireAdmin()
  const to = String(fd.get('to') ?? '').trim()
  if (to) await sendTest(String(fd.get('id')), to)
}
async function remove(fd: FormData) {
  'use server'
  await requireAdmin()
  await db.campaign.deleteMany({ where: { id: String(fd.get('id')), sentAt: null } })
  revalidatePath('/admin/newsletter')
}
async function save(fd: FormData) {
  'use server'
  await requireAdmin()
  await db.campaign.updateMany({ where: { id: String(fd.get('id')), sentAt: null }, data: { subject: String(fd.get('subject')), bodyHtml: String(fd.get('bodyHtml')) } })
  revalidatePath('/admin/newsletter')
}
async function create(fd: FormData) {
  'use server'
  await requireAdmin()
  const list = await mainList()
  const kind = String(fd.get('kind'))
  const d = kind === 'digest' ? await buildDigest() : { subject: 'New newsletter', bodyHtml: '<h2>Title</h2><p>Write here.</p>' }
  if (d) await db.campaign.create({ data: { listId: list.id, subject: d.subject, bodyHtml: d.bodyHtml } })
  revalidatePath('/admin/newsletter')
}

export default async function AdminCampaigns() {
  await requireAdmin()
  const [rows, active] = await Promise.all([
    db.campaign.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    db.subscriber.count({ where: { confirmedAt: { not: null }, unsubscribedAt: null } }),
  ])
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Campaigns</h1>
      <AdminNav />
      <p>{active} confirmed subscribers will receive a sent campaign. <a href="/admin/subscribers">Subscriber list</a></p>
      <form action={create} style={{ display: 'flex', gap: 10, margin: '12px 0 24px' }}>
        <button name="kind" value="digest" className="btn btn-sm">New draft: weekly digest</button>
        <button name="kind" value="blank" className="btn btn-sm">New blank draft</button>
      </form>
      {rows.map((c) => (
        <div key={c.id} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
          <b>{c.sentAt ? `Sent ${c.sentAt.toISOString().slice(0, 16).replace('T', ' ')}` : 'DRAFT'}</b>
          {c.sentAt ? (
            <><h3>{c.subject}</h3><div dangerouslySetInnerHTML={{ __html: c.bodyHtml }} /></>
          ) : (
            <>
              <form action={save}>
                <input type="hidden" name="id" value={c.id} />
                <input name="subject" defaultValue={c.subject} style={{ width: '100%', padding: 10, margin: '10px 0' }} />
                <textarea name="bodyHtml" defaultValue={c.bodyHtml} rows={9} style={{ width: '100%', padding: 10, fontFamily: 'monospace', fontSize: 13 }} />
                <button className="btn btn-sm">Save</button>
              </form>
              <details style={{ margin: '12px 0' }}><summary>Preview</summary><div dangerouslySetInnerHTML={{ __html: c.bodyHtml }} /></details>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <form action={test} style={{ display: 'flex', gap: 6 }}>
                  <input type="hidden" name="id" value={c.id} />
                  <input name="to" type="email" placeholder="test email" style={{ padding: 8 }} />
                  <button className="btn btn-sm">Send test</button>
                </form>
                <form action={send}><input type="hidden" name="id" value={c.id} /><button className="btn btn-yellow btn-sm">Send to {active} subscribers</button></form>
                <form action={remove}><input type="hidden" name="id" value={c.id} /><button className="btn btn-sm">Delete</button></form>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
