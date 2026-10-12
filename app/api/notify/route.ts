import { NextResponse } from 'next/server'
import { notify } from '@/lib/notify'

/** Avviso dall'esterno (Gmail, Zapier, n8n...): POST /api/notify con intestazione x-notify-token = NOTIFY_TOKEN e corpo {"text":"..."} */
export async function POST(req: Request) {
  const token = process.env.NOTIFY_TOKEN
  if (!token || req.headers.get('x-notify-token') !== token) return new NextResponse('Non autorizzato', { status: 401 })
  const b = await req.json().catch(() => null) as { text?: string } | null
  const text = String(b?.text ?? '').trim()
  if (!text) return NextResponse.json({ error: 'text mancante' }, { status: 400 })
  return NextResponse.json({ result: await notify('📩 ' + text) })
}
