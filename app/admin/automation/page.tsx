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
    if (job === 'social') note = `${await runDailySocial()} social drafts created`
    else if (job === 'tool') note = await runToolSocial(String(fd.get('tool') ?? '').trim() || undefined)
    else if (job === 'week') note = await runWeekPlan(/^\d{4}-\d{2}-\d{2}$/.test(String(fd.get('monday'))) ? String(fd.get('monday')) : nextMondayRome())
    else if (job === 'article') note = `Article draft: ${await runWeeklyArticle(String(fd.get('topic') ?? '').trim() || undefined)}`
    else if (job === 'digest') note = `Newsletter draft ${await runWeeklyDigest()}`
  } catch (e) {
    note = `ERROR: ${(e as Error).message}`
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
      <h1>Automation</h1>
      <AdminNav />
      <p>
        Scheduled runs: <b>{on && hasKey ? 'ON' : 'OFF'}</b> {!hasKey && '(ANTHROPIC_API_KEY missing)'} {hasKey && !on && '(set AUTOMATION_ENABLED=true in Railway to turn on)'}
        <br />Schedule (Rome time): social drafts every day from 08:00, blog article draft on Monday from 09:00 (review it in Articles), newsletter draft on Friday from 10:00. Every Friday from 09:00 the next week's social plan (X, Telegram, Facebook, 10:00 each day) is created as drafts on Publer. Everything is created as a draft for you to approve.
      </p>
      <form action={run.bind(null, 'social')} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
        <button formAction={run.bind(null, 'social')} className="btn btn-sm">Run now: social drafts</button>
        <button formAction={run.bind(null, 'digest')} className="btn btn-sm">Run now: newsletter draft</button>
        <span style={{ display: 'flex', gap: 6 }}>
          <input name="monday" placeholder="Monday YYYY-MM-DD (optional)" style={{ padding: 8 }} />
          <button formAction={run.bind(null, 'week')} className="btn btn-sm">Run now: week plan to Publer (drafts)</button>
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <input name="tool" placeholder="tool name (optional)" style={{ padding: 8 }} />
          <button formAction={run.bind(null, 'tool')} className="btn btn-sm">Tool posts for tomorrow 12:00</button>
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <input name="topic" placeholder="optional topic" style={{ padding: 8 }} />
          <button formAction={run.bind(null, 'article')} className="btn btn-sm">Run now: article draft</button>
        </span>
      </form>
      <p style={{ color: 'var(--muted)' }}>Each run takes up to a minute or two. Wait for the page to reload.</p>
      <table className="admin-table">
        <thead><tr><th>When</th><th>Job</th><th>Result</th></tr></thead>
        <tbody>{runs.map((r) => <tr key={r.key}><td>{r.ranAt.toISOString().slice(0, 16).replace('T', ' ')}</td><td>{r.key.replace(/^manual-/, 'manual ').replace(/-\d{10,}$/, '')}</td><td>{r.note}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
