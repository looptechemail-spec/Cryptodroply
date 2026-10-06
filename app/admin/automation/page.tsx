import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { runDailySocial, runToolSocial, runWeekPlan, nextMondayRome, runWeeklyArticle, runWeeklyDigest } from '@/lib/ai-content'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function run(job: string, fd: FormData) {
  'use server'
  await requireAdmin()
  let note = ''
  try {
    if (job === 'social') note = `${await runDailySocial()} bozze social create`
    else if (job === 'tool') note = await runToolSocial(String(fd.get('tool') ?? '').trim() || undefined)
    else if (job === 'week') note = await runWeekPlan(/^\d{4}-\d{2}-\d{2}$/.test(String(fd.get('monday'))) ? String(fd.get('monday')) : nextMondayRome())
    else if (job === 'article') note = `Bozza articolo: ${await runWeeklyArticle(String(fd.get('topic') ?? '').trim() || undefined)}`
    else if (job === 'digest') note = `Bozza newsletter ${await runWeeklyDigest()}`
  } catch (e) {
    note = `ERRORE: ${(e as Error).message}`
  }
  await db.jobRun.create({ data: { key: `manual-${job}-${Date.now()}`, note } })
  revalidatePath('/admin/automation')
}

export default async function Automation() {
  await requireAdmin()
  const runs = await db.jobRun.findMany({ orderBy: { ranAt: 'desc' }, take: 20 })
  const on = process.env.AUTOMATION_ENABLED === 'true'
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Automazione</h1>
      <AdminNav />
      <p>
        Esecuzioni programmate: <b>{on && hasKey ? 'ON' : 'OFF'}</b> {!hasKey && '(manca ANTHROPIC_API_KEY)'} {hasKey && !on && '(imposta AUTOMATION_ENABLED=true su Railway per attivarle)'}
        <br />Programma (ora di Roma): bozze social ogni giorno dalle 08:00, bozza dell’articolo del blog il lunedì dalle 09:00 (controllala in Articoli), bozza della newsletter il venerdì dalle 10:00. Ogni venerdì dalle 09:00 il piano social della settimana dopo (X, Telegram, Facebook, alle 10:00 di ogni giorno) viene creato come bozze su Publer. Tutto viene creato come bozza, sei tu ad approvare.
      </p>
      <form action={run.bind(null, 'social')} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
        <button formAction={run.bind(null, 'social')} className="btn btn-sm">Avvia ora: bozze social</button>
        <button formAction={run.bind(null, 'digest')} className="btn btn-sm">Avvia ora: bozza newsletter</button>
        <span style={{ display: 'flex', gap: 6 }}>
          <input name="monday" placeholder="Lunedì AAAA-MM-GG (facoltativo)" style={{ padding: 8 }} />
          <button formAction={run.bind(null, 'week')} className="btn btn-sm">Avvia ora: piano settimanale su Publer (bozze)</button>
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <input name="tool" placeholder="nome strumento (facoltativo)" style={{ padding: 8 }} />
          <button formAction={run.bind(null, 'tool')} className="btn btn-sm">Post sullo strumento per domani alle 12:00</button>
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <input name="topic" placeholder="argomento (facoltativo)" style={{ padding: 8 }} />
          <button formAction={run.bind(null, 'article')} className="btn btn-sm">Avvia ora: bozza articolo</button>
        </span>
      </form>
      <p style={{ color: 'var(--muted)' }}>Ogni esecuzione può durare uno o due minuti. Aspetta che la pagina si ricarichi.</p>
      <table className="admin-table">
        <thead><tr><th>Quando</th><th>Attività</th><th>Risultato</th></tr></thead>
        <tbody>{runs.map((r) => <tr key={r.key}><td>{r.ranAt.toISOString().slice(0, 16).replace('T', ' ')}</td><td>{r.key.replace(/^manual-/, 'manual ').replace(/-\d{10,}$/, '')}</td><td>{r.note}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
