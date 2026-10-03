import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { STATUSES, STATUS_LABEL, getTemplate, renderInvite, sendInvite, syncCreators, type VideoRef } from '@/lib/creators'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const back = (msg: string): never => redirect(`/admin/creators?msg=${encodeURIComponent(msg.slice(0, 300))}`)
const setNote = (k: string, note: string) => db.jobRun.upsert({ where: { key: `creators-template:${k}` }, update: { note }, create: { key: `creators-template:${k}`, note } })

async function sync() {
  'use server'
  await requireAdmin()
  let msg: string
  try {
    const r = await syncCreators()
    msg = `${r.channels} channels found in the videos, ${r.added} new.${r.failed ? ` ${r.failed} videos could not be read.` : ''}`
  } catch (e) { msg = `ERROR: ${(e as Error).message}` }
  revalidatePath('/admin/creators')
  back(msg)
}

async function saveTemplate(fd: FormData) {
  'use server'
  await requireAdmin()
  await setNote('subject', String(fd.get('subject') ?? '').trim())
  await setNote('body', String(fd.get('body') ?? ''))
  await setNote('replyto', String(fd.get('replyTo') ?? '').trim())
  revalidatePath('/admin/creators')
  back('Text saved')
}

async function act(mode: string, fd: FormData) {
  'use server'
  await requireAdmin()
  const id = String(fd.get('id'))
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  const status = String(fd.get('status') ?? 'TO_CONTACT')
  const notes = String(fd.get('notes') ?? '').trim() || null
  const c = await db.creator.findUnique({ where: { id } })
  if (!c) back('Channel not found')
  let msg = 'Saved'
  try {
    await db.creator.update({ where: { id }, data: { email: email || null, notes, status: (STATUSES as readonly string[]).includes(status) ? status : 'TO_CONTACT' } })
    if (mode !== 'save') {
      const t = await getTemplate()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.replyTo)) throw new Error('First set the Reply-to address (your email) in the text box above and save it')
      const pages = ((c!.pages as unknown) as VideoRef[]) ?? []
      const text = renderInvite(t.body, c!.name, pages)
      if (mode === 'test') {
        msg = (await sendInvite(t.replyTo, `[TEST] ${t.subject}`, text, t.replyTo)) ? `Test sent to ${t.replyTo}` : 'ERROR: email not sent (check Resend)'
      } else {
        if (status === 'DECLINED') throw new Error('This channel is marked "Do not contact"')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Write the channel email first')
        if (await sendInvite(email, t.subject, text, t.replyTo)) {
          await db.creator.update({ where: { id }, data: { status: 'CONTACTED', contactedAt: new Date() } })
          msg = `Sent to ${email}`
        } else msg = 'ERROR: email not sent (check Resend)'
      }
    }
  } catch (e) { msg = `ERROR: ${(e as Error).message}` }
  revalidatePath('/admin/creators')
  back(msg)
}

export default async function Creators({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin()
  const sp = await searchParams
  const [list, t] = await Promise.all([db.creator.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] }), getTemplate()])
  const counts = STATUSES.map((s) => `${STATUS_LABEL[s]}: ${list.filter((c) => c.status === s).length}`).join(' · ')
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Creators</h1>
      <AdminNav />
      {sp.msg && <div style={{ background: /error/i.test(sp.msg) ? '#fde8ea' : '#e6f6ea', borderRadius: 12, padding: '12px 16px', margin: '12px 0', fontWeight: 600 }}>{sp.msg}</div>}
      <p>YouTube channels whose videos are on the tool pages. Add the business email they publish on their channel (About page), then invite them to the partner program. Write to few people at a time, and only to public business addresses.</p>
      <form action={sync} style={{ margin: '12px 0' }}><button className="btn btn-yellow btn-sm">Update the list from the videos</button></form>

      <form action={saveTemplate} style={{ background: '#fff', borderRadius: 20, padding: 20, margin: '16px 0', boxShadow: 'var(--shadow-1)' }}>
        <b>Email text</b>
        <p style={{ margin: '4px 0 10px', fontSize: 14 }}>You can use {'{name}'}, {'{tools}'}, {'{pages}'} (the pages with their video) and {'{affiliate}'} (where they get their link).</p>
        <label>Reply-to (your email: the answers arrive here, and tests are sent here)</label>
        <input name="replyTo" defaultValue={t.replyTo} placeholder="you@example.com" style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <label>Subject</label>
        <input name="subject" defaultValue={t.subject} style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <label>Text</label>
        <textarea name="body" rows={14} defaultValue={t.body} style={{ width: '100%', padding: 10, margin: '6px 0 12px' }} />
        <button className="btn btn-sm">Save the text</button>
      </form>

      <h2>Channels ({list.length})</h2>
      <p style={{ fontSize: 14 }}>{counts}</p>
      {list.length === 0 && <p>No channels yet. Press &quot;Update the list from the videos&quot;.</p>}
      {list.map((c) => {
        const pages = ((c.pages as unknown) as VideoRef[]) ?? []
        return (
          <form key={c.id} action={act.bind(null, 'save')} style={{ background: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, boxShadow: 'var(--shadow-1)' }}>
            <input type="hidden" name="id" value={c.id} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <b><a href={c.channelUrl} target="_blank" rel="noreferrer">{c.name}</a></b>
              <small>{pages.length} {pages.length === 1 ? 'page' : 'pages'}: {pages.map((p) => p.toolTitle).join(', ')}</small>
              {c.contactedAt && <small>· written to on {c.contactedAt.toISOString().slice(0, 10)}</small>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
              <input name="email" type="email" defaultValue={c.email ?? ''} placeholder="channel business email" style={{ padding: 8, minWidth: 240, flex: 1 }} />
              <select name="status" defaultValue={c.status} style={{ padding: 8 }}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <input name="notes" defaultValue={c.notes ?? ''} placeholder="notes" style={{ width: '100%', padding: 8, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button formAction={act.bind(null, 'save')} className="btn btn-sm">Save</button>
              <button formAction={act.bind(null, 'test')} className="btn btn-sm">Send a test to me</button>
              <button formAction={act.bind(null, 'send')} className="btn btn-blue btn-sm">Send the invite</button>
            </div>
          </form>
        )
      })}
    </div>
  )
}
