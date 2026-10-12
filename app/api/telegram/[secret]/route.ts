import { NextResponse } from 'next/server'
import { handleUpdate } from '@/lib/agent'
import { agentToken, webhookSecret } from '@/lib/tgbot'

/** Webhook del bot Telegram dell'agente. L'indirizzo contiene un codice segreto e Telegram invia anche l'intestazione di controllo. */
export async function POST(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params
  if (!agentToken() || secret !== webhookSecret() || req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) return new NextResponse('no', { status: 403 })
  const update = await req.json().catch(() => null)
  if (update) handleUpdate(update) // risponde subito a Telegram, il lavoro continua in secondo piano
  return NextResponse.json({ ok: true })
}
