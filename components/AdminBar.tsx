import { cookies, headers } from 'next/headers'
import { isAdmin, getUser } from '@/lib/auth'

/** Barra visibile solo agli admin: passa dalla vista admin alla vista visitatore. */
export default async function AdminBar() {
  const user = await getUser().catch(() => null)
  if (!(await isAdmin().catch(() => false)) && user?.role !== 'ADMIN') return null
  const visitor = (await cookies()).get('cd_preview')?.value === 'visitor'
  const back = encodeURIComponent((await headers()).get('x-pathname') ?? '/')
  return (
    <div className="admin-bar">
      <span>{visitor ? 'Viewing as a visitor (no PRO)' : 'Admin view: you see everything, PRO included'}</span>
      <a href={`/api/preview?mode=${visitor ? 'admin' : 'visitor'}&back=${back}`}>{visitor ? 'Back to admin view' : 'View as visitor'}</a>
    </div>
  )
}
