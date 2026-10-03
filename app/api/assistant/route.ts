import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { hasPro } from '@/lib/access'
import { answer, hashIp, LIMITS, useMessage, type Msg, type Tier } from '@/lib/assistant'

export const maxDuration = 90

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { messages?: Msg[]; lang?: string } | null
  const lang = body?.lang === 'it' ? 'it' : 'en'
  const messages = (body?.messages ?? [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-10).map((m) => ({ role: m.role, content: m.content.trim().slice(0, 1200) }))
  if (!messages.length || messages[messages.length - 1].role !== 'user') return NextResponse.json({ error: 'bad-request' }, { status: 400 })

  const user = await getUser().catch(() => null)
  const pro = await hasPro()
  const tier: Tier = pro ? 'pro' : user ? 'free' : 'anon'
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const key = user ? `u:${user.id}` : `ip:${hashIp(ip)}`
  const left = await useMessage(key, LIMITS[tier]).catch(() => 0)
  if (left < 0) return NextResponse.json({ error: 'limit', tier, limit: LIMITS[tier] }, { status: 429 })
  try {
    const reply = await answer(messages, tier, lang)
    return NextResponse.json({ reply, left, tier })
  } catch (e) {
    const off = (e as Error).message === 'assistant-off'
    return NextResponse.json({ error: off ? 'off' : 'failed' }, { status: off ? 503 : 502 })
  }
}
