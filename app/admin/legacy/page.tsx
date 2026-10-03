import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { importLegacyContacts, legacyCounts, sendLegacyInvites, sendLegacyTest, DEFAULTS } from '@/lib/legacy-contacts'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const back = (msg: string): never => redirect(`/admin/legacy?msg=${encodeURIComponent(msg.slice(0, 400))}`)

async function importNow() {
  'use server'
  await requireAdmin()
  let msg: string
  try {
    const r = await importLegacyContacts()
    msg = `Import done: ${r.contacts} contacts read from Wix, ${r.added} new saved, ${r.paid} paying people found, ${r.skipped} skipped (already registered or unsubscribed).${r.notes.length ? ' Notes: ' + r.notes.slice(0, 3).join(' | ') : ''}`
  } catch (e) { msg = `ERROR: ${(e as Error).message}` }
  revalidatePath('/admin/legacy')
  back(msg)
}

async function act(mode: string, fd: FormData) {
  'use server'
  await requireAdmin()
  const group = String(fd.get('group')) === 'PAID' ? 'PAID' : 'CONTACT'
  const subject = String(fd.get('subject') ?? '').trim()
  const body = String(fd.get('body') ?? '')
  let msg: string
  try {
    if (!subject || !body) throw new Error('Subject e testo sono obbligatori')
    if (mode === 'test') {
      const to = String(fd.get('testTo') ?? '').trim()
      if (!/^[^\s@]+@[^\s@]+$/.test(to)) throw new Error('Scrivi la tua email per la prova')
      msg = (await sendLegacyTest(group, subject, body, to)) ? `Test email sent to ${to}` : 'ERROR: test non inviato (controlla RESEND_API_KEY e EMAIL_FROM)'
    } else {
      if (String(fd.get('confirm') ?? '').trim().toUpperCase() !== 'SEND') throw new Error('Per inviare scrivi SEND nel campo di conferma')
      const limit = Math.min(Math.max(Number(fd.get('limit')) || 100, 1), 500)
      const r = await sendLegacyInvites(group, subject, body, limit)
      msg = r.picked ? `Sent ${r.sent} of ${r.picked} emails` : 'Nobody left to write to in this group'
    }
  } catch (e) { msg = `ERROR: ${(e as Error).message}` }
  revalidatePath('/admin/legacy')
  back(msg)
}

const box = { width: '100%', padding: 10, marginBottom: 8 } as const

export default async function Legacy({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin()
  const { msg } = await searchParams
  const c = await legacyCounts()
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Old site contacts</h1>
      <AdminNav />
      {msg && <p style={{ padding: '12px 16px', borderRadius: 12, fontWeight: 700, background: /^error/i.test(msg) ? '#fde8e8' : '#e6f6ea' }}>{msg}</p>}
      <p>
        Step 1: read the contacts and the people who paid a plan from the old Wix site. Step 2: check the text and send yourself a test.
        Step 3: send in groups (it is safer for a new sender to start small). Everyone is written to only once, and people who unsubscribed on Wix, who already signed up here, or who click “Do not contact me” are left out.
      </p>
      <form action={importNow}><button className="btn btn-yellow btn-sm">1. Import contacts from Wix (takes a minute)</button></form>
      <p><b>{c.total}</b> saved · <b>{c.contacts}</b> contacts to invite · <b>{c.paid}</b> paying people to invite · {c.invited} already written to · {c.optOut} do not want emails</p>
      {(['CONTACT', 'PAID'] as const).map((g) => (
        <form key={g} action={act.bind(null, 'send')} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-1)' }}>
          <input type="hidden" name="group" value={g} />
          <h2 style={{ marginTop: 0 }}>{g === 'PAID' ? `People who paid (${c.paid} left)` : `Other contacts (${c.contacts} left)`}</h2>
          <label style={{ fontWeight: 700 }}>Subject</label>
          <input name="subject" defaultValue={DEFAULTS[g].subject} style={box} />
          <label style={{ fontWeight: 700 }}>Text (HTML). {'{name}'} = first name, {'{button}'} = sign-up button</label>
          <textarea name="body" defaultValue={DEFAULTS[g].body} rows={10} style={{ ...box, fontFamily: 'monospace' }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <input name="testTo" type="email" placeholder="your email for the test" style={{ padding: 10, minWidth: 240 }} />
            <button formAction={act.bind(null, 'test')} className="btn btn-sm">2. Send me a test</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>How many now (max 500) <input name="limit" type="number" defaultValue={100} min={1} max={500} style={{ padding: 10, width: 90 }} /></label>
            <input name="confirm" placeholder="type SEND to confirm" style={{ padding: 10 }} />
            <button className="btn btn-blue btn-sm">3. Send</button>
          </div>
        </form>
      ))}
      <p style={{ color: 'var(--muted)' }}>
        Important for people who paid: payments on the old site are not moved. If a plan is still active on Wix, cancel it there so nobody is charged twice.
      </p>
    </div>
  )
}
