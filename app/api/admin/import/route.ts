import { timingSafeEqual } from 'node:crypto'
import { runWixImport } from '@/lib/wix-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 600

function ok(given: string) {
  const expected = process.env.ADMIN_PASSWORD ?? ''
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string }
  if (!process.env.ADMIN_PASSWORD) return new Response('ADMIN_PASSWORD non impostata su Railway.', { status: 503 })
  if (!ok(password ?? '')) return new Response('Password errata.', { status: 401 })

  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (m: string) => controller.enqueue(enc.encode(m + '\n'))
      try {
        send('Avvio import da Wix...')
        await runWixImport(send)
      } catch (e) {
        send('ERRORE: ' + (e instanceof Error ? e.message : String(e)))
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
