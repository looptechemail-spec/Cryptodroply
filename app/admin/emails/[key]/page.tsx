import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { flowByKey } from '@/lib/email-flows'
import { sendTestEmail } from '@/lib/email-actions'

export const dynamic = 'force-dynamic'

export default async function AdminEmail({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin()
  const { key } = await params
  const { msg } = await searchParams
  const flow = flowByKey(key)
  if (!flow) notFound()
  const mail = await Promise.resolve(flow.build())
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>{flow.name}</h1>
      <AdminNav />
      <p><Link href="/admin/emails">← All emails</Link></p>
      {msg && <p style={{ background: '#fff', padding: '12px 16px', borderRadius: 14, fontWeight: 600 }}>{msg}</p>}
      <p><b>When:</b> {flow.when}<br /><b>To:</b> {flow.to}<br /><b>Subject:</b> {mail.subject}</p>
      <form action={sendTestEmail} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 20px' }}>
        <input type="hidden" name="key" value={flow.key} />
        <input name="to" type="email" required placeholder="Send a test to..." defaultValue={process.env.CONTACT_TO ?? ''} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #ddd', minWidth: 260 }} />
        <button className="btn btn-blue btn-sm" type="submit">Send test</button>
      </form>
      <p style={{ fontSize: 13, color: '#666' }}>Example data is used (name Alex, 14 euro). The text of the emails is in the code: tell me what to change and I will update it.</p>
      <iframe title={flow.name} sandbox="" srcDoc={mail.html} style={{ width: '100%', maxWidth: 640, height: 720, border: '1px solid #e5e5e5', borderRadius: 16, background: '#fff' }} />
    </div>
  )
}
