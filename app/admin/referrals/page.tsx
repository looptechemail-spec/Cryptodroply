import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { HOLD_DAYS, MIN_PAYOUT_CENTS, euro } from '@/lib/referral'

export const dynamic = 'force-dynamic'

export default async function AdminReferrals() {
  await requireAdmin()
  const releaseAt = new Date(Date.now() - HOLD_DAYS * 864e5)
  const rows = await db.commission.findMany({ where: { status: 'PENDING' }, include: { earner: true } })
  const byUser = new Map<string, { email: string; info: string | null; ready: number; hold: number }>()
  for (const c of rows) {
    const e = byUser.get(c.earnerId) ?? { email: c.earner.email, info: c.earner.payoutInfo, ready: 0, hold: 0 }
    if (c.createdAt <= releaseAt) e.ready += c.amountCents
    else e.hold += c.amountCents
    byUser.set(c.earnerId, e)
  }
  const paid = await db.commission.aggregate({ where: { status: 'PAID' }, _sum: { amountCents: true } })
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Referral payouts</h1>
      <AdminNav />
      <p>Paid so far: {euro(paid._sum.amountCents ?? 0)}. Minimum payout: {euro(MIN_PAYOUT_CENTS)}.</p>
      <table className="admin-table">
        <thead><tr><th>Member</th><th>Ready</th><th>In hold</th><th>Pay to</th><th></th></tr></thead>
        <tbody>
          {[...byUser.entries()].map(([id, e]) => (
            <tr key={id}>
              <td>{e.email}</td>
              <td><b>{euro(e.ready)}</b></td>
              <td>{euro(e.hold)}</td>
              <td>{e.info ?? <em>not set</em>}</td>
              <td>
                {e.ready >= MIN_PAYOUT_CENTS && (
                  <form method="post" action="/api/admin/referrals">
                    <input type="hidden" name="userId" value={id} />
                    <button className="btn btn-blue btn-sm" type="submit">Mark as paid</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
