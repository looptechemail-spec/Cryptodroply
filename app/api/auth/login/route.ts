import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { SESSION_COOKIE, cookieOptions, signToken } from '@/lib/auth'

export async function POST(req: Request) {
  const form = await req.formData()
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  const user = email ? await db.user.findUnique({ where: { email } }) : null
  // stesso tempo di risposta e stesso messaggio se l'utente non esiste o la password è sbagliata
  const ok = await bcrypt.compare(password, user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva')
  if (!user || !ok) return NextResponse.redirect(new URL('/login?error=1', req.url), 303)

  const res = NextResponse.redirect(new URL('/account', req.url), 303)
  res.cookies.set(SESSION_COOKIE, signToken({ uid: user.id }, 60 * 60 * 24 * 30), cookieOptions(60 * 60 * 24 * 30))
  return res
}
