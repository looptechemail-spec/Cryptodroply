import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { dateToRome, romeToDate } from '@/lib/time'
import { sendToPubler } from '@/lib/publer'
import { parseCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function save(fd: FormData) {
  'use server'
  await requireAdmin()
  const when = String(fd.get('scheduledAt') ?? '')
  const act = String(fd.get('act'))
  await db.socialPost.update({
    where: { id: String(fd.get('id')) },
    data: {
      text: String(fd.get('text')),
      scheduledAt: when ? romeToDate(when) : null,
      ...(act === 'approve' ? { status: 'APPROVED' } : act === 'reject' ? { status: 'REJECTED' } : act === 'draft' ? { status: 'DRAFT' } : {}),
    },
  })
  if (act === 'publer-draft' || act === 'publer-schedule') {
    const p = await db.socialPost.findUnique({ where: { id: String(fd.get('id')) } })
    if (p) {
      const state = act === 'publer-draft' ? 'draft' : 'scheduled'
      try {
        const job = await sendToPubler(p, state)
        await db.socialPost.update({ where: { id: p.id }, data: { status: 'PUBLER', publerRef: `${state}:${job}`, sentAt: new Date() } })
      } catch (e) {
        await db.socialPost.update({ where: { id: p.id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
      }
    }
  }
  revalidatePath('/admin/social')
}

async function importCsv(fd: FormData) {
  'use server'
  await requireAdmin()
  const f = fd.get('file')
  if (!(f instanceof File) || !f.size) return
  const rows = parseCsv(await f.text())
  const head = rows.shift() ?? []
  const iDate = head.indexOf('Date'), iText = head.indexOf('Text'), iLink = head.indexOf('Link(s)')
  if (iDate < 0 || iText < 0) return
  for (const r of rows) {
    const when = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r[iDate] ?? '') ? romeToDate(r[iDate].replace(' ', 'T')) : null
    const text = (r[iText] ?? '').trim()
    if (!text) continue
    for (const channel of ['x', 'telegram', 'facebook']) {
      await db.socialPost.create({ data: { channel, text, linkUrl: iLink >= 0 && r[iLink] ? r[iLink] : null, scheduledAt: when } })
    }
  }
  revalidatePath('/admin/social')
}

async function sendAll(fd: FormData) {
  'use server'
  await requireAdmin()
  const state = String(fd.get('state')) === 'scheduled' ? 'scheduled' : 'draft'
  const list = await db.socialPost.findMany({ where: { status: { in: ['DRAFT', 'APPROVED'] }, channel: { in: ['x', 'telegram', 'facebook'] }, scheduledAt: { not: null } }, orderBy: { scheduledAt: 'asc' }, take: 60 })
  for (const p of list) {
    try {
      const job = await sendToPubler(p, state)
      await db.socialPost.update({ where: { id: p.id }, data: { status: 'PUBLER', publerRef: `${state}:${job}`, sentAt: new Date() } })
    } catch (e) {
      await db.socialPost.update({ where: { id: p.id }, data: { publerRef: `ERROR: ${(e as Error).message}`.slice(0, 400) } })
    }
  }
  revalidatePath('/admin/social')
}

const TABS = ['DRAFT', 'APPROVED', 'PUBLER', 'SENT', 'REJECTED']

export default async function AdminSocial({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireAdmin()
  const s = TABS.includes((await searchParams).s ?? '') ? (await searchParams).s! : 'DRAFT'
  const rows = await db.socialPost.findMany({ where: { status: s }, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 100 })
  const local = dateToRome
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Social posts</h1>
      <AdminNav />
      <p>{TABS.map((t) => <a key={t} href={`?s=${t}`} style={{ marginRight: 16, fontWeight: t === s ? 800 : 400 }}>{t}</a>)}</p>
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
        <b>Weekly plan</b>
        <form action={importCsv} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' }}>
          <input type="file" name="file" accept=".csv" required />
          <button className="btn btn-sm">Import CSV (creates X, Telegram and Facebook drafts for every row)</button>
        </form>
        <form action={sendAll} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button name="state" value="draft" className="btn btn-blue btn-sm">Send all dated drafts to Publer as drafts</button>
          <button name="state" value="scheduled" className="btn btn-yellow btn-sm">Schedule them all on Publer</button>
        </form>
      </div>
      {rows.length === 0 && <p>Nothing here.</p>}
      {rows.map((r) => (
        <form key={r.id} action={save} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
          <input type="hidden" name="id" value={r.id} />
          <b>{r.channel}</b> {r.linkUrl && <a href={r.linkUrl} target="_blank" rel="noreferrer">link</a>} {r.imageUrl && <a href={r.imageUrl} target="_blank" rel="noreferrer">image</a>}
          {r.publerRef && <div style={{ fontSize: 13, color: r.publerRef.startsWith('ERROR') ? '#b00020' : 'var(--muted)' }}>Publer: {r.publerRef}</div>}
          <textarea name="text" defaultValue={r.text} rows={5} style={{ width: '100%', padding: 10, margin: '10px 0' }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>Publish at (Rome time) <input type="datetime-local" name="scheduledAt" defaultValue={local(r.scheduledAt)} /></label>
            <button name="act" value="save" className="btn btn-sm">Save</button>
            {r.status !== 'APPROVED' && r.status !== 'SENT' && <button name="act" value="approve" className="btn btn-yellow btn-sm">Approve</button>}
            {r.status === 'APPROVED' && <button name="act" value="draft" className="btn btn-sm">Back to draft</button>}
            {(r.status === 'DRAFT' || r.status === 'APPROVED') && ['telegram', 'x', 'facebook'].includes(r.channel) && (
              <>
                <button name="act" value="publer-draft" className="btn btn-blue btn-sm">Send to Publer as draft</button>
                <button name="act" value="publer-schedule" className="btn btn-yellow btn-sm">Schedule on Publer</button>
              </>
            )}
            {r.status === 'DRAFT' && <button name="act" value="reject" className="btn btn-sm">Reject</button>}
          </div>
        </form>
      ))}
    </div>
  )
}
