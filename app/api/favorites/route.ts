import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUser } from '@/lib/auth'

/** Salva o toglie un tool dai preferiti. Body JSON: { toolId } */
export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 })
  const { toolId } = await req.json().catch(() => ({}))
  if (typeof toolId !== 'string') return NextResponse.json({ error: 'toolId' }, { status: 400 })
  const key = { userId_toolId: { userId: user.id, toolId } }
  const had = await db.favorite.findUnique({ where: key })
  if (had) await db.favorite.delete({ where: key })
  else await db.favorite.create({ data: { userId: user.id, toolId } })
  return NextResponse.json({ saved: !had })
}
