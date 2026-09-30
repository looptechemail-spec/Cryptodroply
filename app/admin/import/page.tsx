import Link from 'next/link'
import ImportClient from '@/components/ImportClient'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  await requireAdmin()
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <p style={{ marginTop: 28 }}>
        <Link href="/admin" style={{ fontWeight: 700, textDecoration: 'underline' }}>Back to admin</Link>
      </p>
      <ImportClient />
    </div>
  )
}
