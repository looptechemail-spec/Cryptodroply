import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await db.media.findUnique({ where: { id } })
  if (!m) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(m.data), {
    headers: { 'Content-Type': m.contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
