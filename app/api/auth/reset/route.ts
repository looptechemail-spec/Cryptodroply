import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { readToken } from '@/lib/auth'

export async function POST(req: Request) {
  const form = await req.formData()
  const token = String(form.get('t') ?? '')
  const password = String(form.get('password') ?? '')
  const data = readToken(token)
  if (!data || data.act !== 'reset' || password.length < 8) return NextResponse.redirect(absUrl(`/reset?t=${encodeURIComponent(token)}&error=1`, req), 303)
  const user = await db.user.findUnique({ where: { id: data.uid } })
  if (!user?.passwordHash || user.passwordHash.slice(-12) !== data.pw) return NextResponse.redirect(absUrl('/reset?error=expired', req), 303)
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12) } })
  return NextResponse.redirect(absUrl('/login?reset=1', req), 303)
}
