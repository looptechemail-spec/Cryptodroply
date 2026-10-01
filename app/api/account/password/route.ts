import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { absUrl } from '@/lib/url'

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(absUrl('/login', req), 303)
  const form = await req.formData()
  const current = String(form.get('current') ?? '')
  const next = String(form.get('next') ?? '')
  if (next.length < 8) return NextResponse.redirect(absUrl('/account?error=short', req), 303)
  if (!user.passwordHash || !(await bcrypt.compare(current, user.passwordHash)))
    return NextResponse.redirect(absUrl('/account?error=password', req), 303)
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } })
  return NextResponse.redirect(absUrl('/account?saved=password', req), 303)
}
