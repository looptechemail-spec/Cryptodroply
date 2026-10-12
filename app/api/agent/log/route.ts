import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiKeyOk } from '@/lib/admin'

/** Registro condiviso per Claude (chiave N8N_API_KEY, intestazione Authorization: Bearer ...).
 *  GET -> ultime attività e coda. POST {title, detail?, status?, id?, result?} -> aggiunge una voce o chiude una richiesta in coda. */
export async function GET(req: Request) {
  if (!apiKeyOk(req)) return new NextResponse('Non autorizzato', { status: 401 })
  const rows = await db.agentTask.findMany({ orderBy: { createdAt: 'desc' }, take: 40, select: { id: true, kind: true, title: true, detail: true, status: true, source: true, result: true, createdAt: true } })
  return NextResponse.json({ queued: rows.filter((r) => r.status === 'QUEUED'), recent: rows })
}

export async function POST(req: Request) {
  if (!apiKeyOk(req)) return new NextResponse('Non autorizzato', { status: 401 })
  const b = await req.json().catch(() => null) as { id?: string; title?: string; detail?: string; status?: string; result?: string } | null
  if (!b) return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  const status = ['DONE', 'FAILED', 'INFO', 'QUEUED'].includes(String(b.status)) ? String(b.status) : 'DONE'
  if (b.id) {
    await db.agentTask.update({ where: { id: b.id }, data: { status, result: b.result?.slice(0, 500) ?? undefined } })
    return NextResponse.json({ ok: true })
  }
  if (!b.title) return NextResponse.json({ error: 'title mancante' }, { status: 400 })
  const t = await db.agentTask.create({ data: { kind: 'claude', title: b.title.slice(0, 240), detail: (b.detail ?? '').slice(0, 2000), status, source: 'claude', result: b.result?.slice(0, 500) } })
  return NextResponse.json({ ok: true, id: t.id })
}
