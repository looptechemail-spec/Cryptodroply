import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { launchChecks } from '@/lib/launch-check'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ICON = { ok: '✅', warn: '⚠️', bad: '❌' } as const

export default async function AdminLaunch() {
  await requireAdmin()
  const rows = await launchChecks()
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
    </div>
  )
}
