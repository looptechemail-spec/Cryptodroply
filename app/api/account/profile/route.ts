import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { absUrl } from '@/lib/url'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(absUrl('/login', req), 303)
  const form = await req.formData()
  const name = String(form.get('name') ?? '').trim().slice(0, 80)
  await db.user.update({ where: { id: user.id }, data: { name: name || null } })
  return NextResponse.redirect(absUrl('/account?saved=profile', req), 303)
}
