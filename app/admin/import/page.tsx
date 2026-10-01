import ImportClient from '@/components/ImportClient'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  await requireAdmin()
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div style={{ marginTop: 28 }}><AdminNav /></div>
      <ImportClient />
    </div>
  )
}
