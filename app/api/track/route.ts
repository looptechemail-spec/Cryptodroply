import { createHash } from 'node:crypto'
import { db } from '@/lib/db'

/** Conta una visita di pagina. Nessun cookie, nessun dato personale: id sessione = hash di IP, browser e giorno. */
export async function POST(req: Request) {
  const ua = req.headers.get('user-agent') ?? ''
  if (/bot|crawl|spider|preview|monitor|curl|wget/i.test(ua)) return new Response(null, { status: 204 })
  const { path, referrer } = await req.json().catch(() => ({}))
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) return new Response(null, { status: 204 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const sessionId = createHash('sha256').update(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}`).digest('hex').slice(0, 16)
  await db.event
    .create({ data: { kind: 'PAGE_VIEW', path: path.slice(0, 300), referrer: typeof referrer === 'string' ? referrer.slice(0, 300) : null, country: req.headers.get('cf-ipcountry'), sessionId } })
    .catch(() => undefined)
  return new Response(null, { status: 204 })
}
