import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { db } from '@/lib/db'

/**
 * Link affiliato tracciato: /go/<id del tool> registra il click e reindirizza al sito del tool.
 * Nessun dato personale: la sessione è un hash anonimo di IP + user agent + giorno.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tool = await db.tool.findUnique({ where: { id }, select: { id: true, refLink: true, websiteUrl: true } })
  const target = tool?.refLink ?? tool?.websiteUrl
  if (!tool || !target) return NextResponse.redirect(new URL('/', req.url))

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const day = new Date().toISOString().slice(0, 10)
  const sessionId = createHash('sha256')
    .update(`${ip}|${req.headers.get('user-agent') ?? ''}|${day}`)
    .digest('hex')
    .slice(0, 16)

  await db.event
    .create({
      data: {
        kind: 'AFFILIATE_CLICK',
        toolId: tool.id,
        path: req.headers.get('referer') ? new URL(req.headers.get('referer')!).pathname : null,
        referrer: req.headers.get('referer'),
        country: req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry'),
        sessionId,
      },
    })
    .catch(() => undefined) // il click non deve mai bloccare il reindirizzamento

  return NextResponse.redirect(target, 302)
}
