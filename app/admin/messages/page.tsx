import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function reply(fd: FormData) {
  'use server'
  await requireAdmin()
  const id = String(fd.get('id') ?? '')
  const text = String(fd.get('text') ?? '').trim()
  const m = await db.formSubmission.findUnique({ where: { id } })
  if (!m?.email || text.length < 2) redirect('/admin/messages?r=' + encodeURIComponent('ERRORE: scrivi il testo della risposta'))
  const original = String((m.payload as Record<string, unknown>).message ?? '')
  const html = text.split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('') +
    (original ? `<hr><p style="color:#777;font-size:13px">Il tuo messaggio:<br>${esc(original).replace(/\n/g, '<br>')}</p>` : '')
  const ok = await sendEmail({ to: m.email, subject: 'Re: il tuo messaggio a Cryptodroply', html, replyTo: process.env.CONTACT_TO ?? process.env.EMAIL_FROM })
  if (!ok) redirect('/admin/messages?r=' + encodeURIComponent('ERRORE: email non inviata (controlla Resend)'))
  await db.formSubmission.update({ where: { id }, data: { handled: true } })
  revalidatePath('/admin/messages')
  revalidatePath('/admin')
  redirect('/admin/messages?r=' + encodeURIComponent(`Email inviata a ${m.email} e messaggio segnato come gestito.`))
}

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await requireAdmin()
  const { r } = await searchParams
  const rows = await db.formSubmission.findMany({ orderBy: [{ handled: 'asc' }, { createdAt: 'desc' }], take: 200 })
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Messaggi</h1>
      <AdminNav />
      {r && <p role="status" style={{ padding: '12px 16px', borderRadius: 12, fontWeight: 700, background: r.startsWith('ERR') ? '#fde8e8' : '#e6f6ea', color: r.startsWith('ERR') ? '#a11' : '#145a2a' }}>{r}</p>}
      <table className="admin-table">
        <thead><tr><th>Data</th><th>Da</th><th>Messaggio</th><th>Rispondi</th></tr></thead>
        <tbody>
          {rows.map((m) => {
            const p = m.payload as Record<string, unknown>
            return (
              <tr key={m.id} id={`m-${m.id}`} style={{ opacity: m.handled ? 0.5 : 1 }}>
                <td>{m.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
                <td>{m.email}<br /><small>{m.type}</small></td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{Object.entries(p).map(([k, v]) => `${k}: ${v}`).join('\n')}</td>
                <td style={{ minWidth: 280 }}>
                  {!m.handled && (
                    <>
                      {m.email && (
                        <form action={reply} style={{ marginBottom: 8 }}>
                          <input type="hidden" name="id" value={m.id} />
                          <textarea name="text" rows={4} placeholder="Scrivi la risposta: parte per email e il messaggio risulta gestito" style={{ width: '100%', padding: 8 }} required />
                          <button className="btn btn-blue btn-sm" type="submit">Invia email</button>
                        </form>
                      )}
                      <form method="post" action="/api/admin/messages">
                        <input type="hidden" name="id" value={m.id} />
                        <button className="btn btn-outline-dark btn-sm" type="submit">Segna come gestito senza rispondere</button>
                      </form>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
