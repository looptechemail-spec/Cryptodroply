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
    msg = `Importazione completata: ${r.contacts} contatti letti da Wix, ${r.added} nuovi salvati, ${r.paid} persone con piano a pagamento trovate, ${r.skipped} saltate (già registrate o disiscritte).${r.notes.length ? ' Note: ' + r.notes.slice(0, 3).join(' | ') : ''}`
  } catch (e) { msg = `ERRORE: ${(e as Error).message}` }
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
    if (!subject || !body) throw new Error('Oggetto e testo sono obbligatori')
    if (mode === 'test') {
      const to = String(fd.get('testTo') ?? '').trim()
      if (!/^[^\s@]+@[^\s@]+$/.test(to)) throw new Error('Scrivi la tua email per la prova')
      msg = (await sendLegacyTest(group, subject, body, to)) ? `Email di prova inviata a ${to}` : 'ERRORE: prova non inviata (controlla RESEND_API_KEY e EMAIL_FROM)'
    } else {
      if (String(fd.get('confirm') ?? '').trim().toUpperCase() !== 'SEND') throw new Error('Per inviare scrivi SEND nel campo di conferma')
      const limit = Math.min(Math.max(Number(fd.get('limit')) || 100, 1), 500)
      const r = await sendLegacyInvites(group, subject, body, limit)
      msg = r.picked ? `Inviate ${r.sent} email su ${r.picked}` : 'Nessuno a cui scrivere in questo gruppo'
    }
  } catch (e) { msg = `ERRORE: ${(e as Error).message}` }
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
      <h1>Contatti del vecchio sito</h1>
      <AdminNav />
      {msg && <p style={{ padding: '12px 16px', borderRadius: 12, fontWeight: 700, background: /^error/i.test(msg) ? '#fde8e8' : '#e6f6ea' }}>{msg}</p>}
      <p>
        Passo 1: leggi i contatti e le persone che hanno pagato un piano dal vecchio sito Wix. Passo 2: controlla il testo e mandati una prova.
        Passo 3: invia a gruppi (per un mittente nuovo è più sicuro partire in piccolo). A ognuno si scrive una sola volta e restano esclusi chi si è disiscritto su Wix, chi si è già registrato qui o chi clicca «Non contattarmi».
      </p>
      <form action={importNow}><button className="btn btn-yellow btn-sm">1. Importa i contatti da Wix (ci vuole circa un minuto)</button></form>
      <p><b>{c.total}</b> salvati · <b>{c.contacts}</b> contatti da invitare · <b>{c.paid}</b> persone con piano a pagamento da invitare · {c.invited} già contattati · {c.optOut} non vogliono email</p>
      {(['CONTACT', 'PAID'] as const).map((g) => (
        <form key={g} action={act.bind(null, 'send')} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-1)' }}>
          <input type="hidden" name="group" value={g} />
          <h2 style={{ marginTop: 0 }}>{g === 'PAID' ? `Chi ha pagato (ne restano ${c.paid})` : `Altri contatti (ne restano ${c.contacts})`}</h2>
          <label style={{ fontWeight: 700 }}>Oggetto</label>
          <input name="subject" defaultValue={DEFAULTS[g].subject} style={box} />
          <label style={{ fontWeight: 700 }}>Testo (HTML). {'{name}'} = nome di battesimo, {'{button}'} = pulsante di registrazione</label>
          <textarea name="body" defaultValue={DEFAULTS[g].body} rows={10} style={{ ...box, fontFamily: 'monospace' }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <input name="testTo" type="email" placeholder="la tua email per la prova" style={{ padding: 10, minWidth: 240 }} />
            <button formAction={act.bind(null, 'test')} className="btn btn-sm">2. Inviami una prova</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>Quante ora (massimo 500) <input name="limit" type="number" defaultValue={100} min={1} max={500} style={{ padding: 10, width: 90 }} /></label>
            <input name="confirm" placeholder="scrivi SEND per confermare" style={{ padding: 10 }} />
            <button className="btn btn-blue btn-sm">3. Invia</button>
          </div>
        </form>
      ))}
      <p style={{ color: 'var(--muted)' }}>
        Importante per chi ha pagato: i pagamenti del vecchio sito non vengono trasferiti. Se un piano è ancora attivo su Wix, disdicilo lì così nessuno paga due volte.
      </p>
    </div>
  )
}
