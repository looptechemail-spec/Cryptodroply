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
  { id: 'payment-test', when: 'These days', title: 'Real payment test', how: 'Sign up with a test email, subscribe to PRO with your own card, check it shows as active in Admin > Users, then cancel and refund it in Stripe.' },
  { id: 'search-console', when: 'This week', title: 'Google Search Console', how: 'Add the property www.cryptodroply.com, submit /sitemap.xml (it includes the /it pages) and check that the main pages get indexed.' },
  { id: 'italian-emails', when: 'This week', title: 'Emails and Best-of pages in Italian', how: 'Welcome, payment confirmation and password reset emails, and the /best pages, are still in English. Ask Claude to translate them.' },
  { id: 'railway-domains', when: 'This week', title: 'Remove the 3 extra Railway addresses', how: 'In Railway > Networking delete the three *.up.railway.app addresses so only www.cryptodroply.com and cryptodroply.com stay public.' },
  { id: 'uptime', when: 'This week', title: 'Alert if the site goes down', how: 'Free check (for example UptimeRobot) on https://www.cryptodroply.com that emails you if it does not answer.' },
  { id: 'best-pages', when: 'This week', title: 'Publish the Best-of pages', how: 'Content shows 0 published SEO pages. Create and publish the first ones from Admin > Articles > Best-of pages (SEO). They bring visits from Google.' },
  { id: 'assistant-log', when: 'Next', title: 'Log of the assistant questions', how: 'Save the questions users ask (no personal data) to see what content is missing. Ask Claude to add it. Also watch the AI cost in the Anthropic console and set a monthly limit.' },
  { id: 'free-sequence', when: 'Next', title: 'Email sequence for free sign-ups', how: 'Check the welcome sequence in Admin > Emails and add the step that presents PRO after a few days, in an educational tone.' },
  { id: 'backup', when: 'Later', title: 'Database backup', how: 'Turn on backups for the Postgres database in Railway. It now holds real users and subscriptions.' },
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
      <h1>Launch check</h1>
      <AdminNav />
      <p>Reads the settings and asks Stripe, Resend and Publer what they see. Nothing is changed here. Reload the page to check again.</p>
      <table className="admin-table">
        <thead><tr><th></th><th>Check</th><th>Result</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}><td>{ICON[r.status]}</td><td><b>{r.label}</b></td><td>{r.detail}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32 }}>To do after launch ({open.length} left)</h2>
      <p>Tick an item when it is done. The list is saved.</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {TODO.map((x) => {
          const isDone = done.has(x.id)
          return (
            <form key={x.id} action={toggle.bind(null, x.id)} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--shadow-1)', display: 'flex', gap: 14, alignItems: 'flex-start', opacity: isDone ? 0.55 : 1 }}>
              <button formAction={toggle.bind(null, x.id)} aria-label={isDone ? 'Mark as not done' : 'Mark as done'} style={{ fontSize: 22, lineHeight: 1, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>{isDone ? '☑️' : '⬜'}</button>
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
