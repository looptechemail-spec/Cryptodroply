import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { launchChecks } from '@/lib/launch-check'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ICON = { ok: '✅', warn: '⚠️', bad: '❌' } as const

/** Cose da sistemare dopo il lancio. Si spuntano da qui e la scelta resta salvata. */
const TODO: { id: string; when: string; title: string; how: string }[] = [
  { id: 'payment-test', when: 'In questi giorni', title: 'Test di pagamento reale', how: 'Registrati con un’email di prova, abbonati al PRO con la tua carta, controlla che risulti attivo in Admin > Utenti, poi annulla e rimborsa su Stripe.' },
  { id: 'search-console', when: 'Questa settimana', title: 'Google Search Console', how: 'Aggiungi la proprietà www.cryptodroply.com, invia /sitemap.xml (include le pagine /it) e controlla che le pagine principali vengano indicizzate.' },
  { id: 'italian-emails', when: 'Questa settimana', title: 'Email e pagine Best-of in italiano', how: 'Le email di benvenuto, di conferma pagamento e di reset password, e le pagine /best, sono ancora in inglese. Chiedi a Claude di tradurle.' },
  { id: 'railway-domains', when: 'Questa settimana', title: 'Rimuovi i 3 indirizzi Railway in più', how: 'In Railway > Networking elimina i tre indirizzi *.up.railway.app, così restano pubblici solo www.cryptodroply.com e cryptodroply.com.' },
  { id: 'uptime', when: 'Questa settimana', title: 'Avviso se il sito non risponde', how: 'Attiva un controllo gratuito (per esempio UptimeRobot) su https://www.cryptodroply.com che ti scrive un’email se il sito non risponde.' },
  { id: 'best-pages', when: 'Questa settimana', title: 'Pubblica le pagine Best-of', how: 'In Contenuti risultano 0 pagine SEO pubblicate. Crea e pubblica le prime da Admin > Articoli > Pagine Best-of (SEO). Portano visite da Google.' },
  { id: 'assistant-log', when: 'Prossimamente', title: 'Registro delle domande all’assistente', how: 'Salva le domande che fanno gli utenti (senza dati personali) per capire quali contenuti mancano. Chiedi a Claude di aggiungerlo. Tieni d’occhio anche il costo dell’AI nella console Anthropic e imposta un limite mensile.' },
  { id: 'free-sequence', when: 'Prossimamente', title: 'Sequenza email per chi si iscrive gratis', how: 'Controlla la sequenza di benvenuto in Admin > Email e aggiungi il passaggio che presenta il PRO dopo qualche giorno, con un tono educativo.' },
  { id: 'backup', when: 'Più avanti', title: 'Backup del database', how: 'Attiva i backup del database Postgres su Railway. Ora contiene utenti e abbonamenti reali.' },
]

async function toggle(id: string) {
  'use server'
  await requireAdmin()
  const key = `launch-todo:${id}`
  const done = await db.jobRun.findUnique({ where: { key } })
  if (done) await db.jobRun.delete({ where: { key } })
  else await db.jobRun.create({ data: { key, note: 'done' } })
  revalidatePath('/admin/launch')
}

export default async function AdminLaunch() {
  await requireAdmin()
  const [rows, doneRows] = await Promise.all([
    launchChecks(),
    db.jobRun.findMany({ where: { key: { startsWith: 'launch-todo:' } }, select: { key: true } }),
  ])
  const done = new Set(doneRows.map((r) => r.key.slice('launch-todo:'.length)))
  const open = TODO.filter((x) => !done.has(x.id))
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Controllo lancio</h1>
      <AdminNav />
      <p>Legge le impostazioni e chiede a Stripe, Resend e Publer cosa vedono. Qui non viene modificato nulla. Ricarica la pagina per controllare di nuovo.</p>
      <table className="admin-table">
        <thead><tr><th></th><th>Controllo</th><th>Risultato</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}><td>{ICON[r.status]}</td><td><b>{r.label}</b></td><td>{r.detail}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32 }}>Da fare dopo il lancio ({open.length} rimaste)</h2>
      <p>Spunta una voce quando l’hai completata. La lista viene salvata.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {TODO.map((x) => {
          const isDone = done.has(x.id)
          return (
            <form key={x.id} action={toggle.bind(null, x.id)} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--shadow-1)', display: 'flex', gap: 14, alignItems: 'flex-start', opacity: isDone ? 0.55 : 1 }}>
              <button formAction={toggle.bind(null, x.id)} aria-label={isDone ? 'Segna come da fare' : 'Segna come fatto'} style={{ fontSize: 22, lineHeight: 1, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>{isDone ? '☑️' : '⬜'}</button>
              <div>
                <b style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{x.title}</b>{' '}
                <small style={{ background: '#eef0ff', borderRadius: 999, padding: '2px 9px', marginLeft: 6 }}>{x.when}</small>
                <div style={{ marginTop: 4 }}>{x.how}</div>
              </div>
            </form>
          )
        })}
      </div>
    </div>
  )
}
