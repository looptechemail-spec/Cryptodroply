import { NextResponse } from 'next/server'
import { adminPasswordOk } from '@/lib/admin'
import { ADMIN_COOKIE, cookieOptions, signToken } from '@/lib/auth'

export async function POST(req: Request) {
  const form = await req.formData()
  if (!process.env.ADMIN_PASSWORD) return NextResponse.redirect(new URL('/admin/login?error=config', req.url), 303)
  if (!adminPasswordOk(String(form.get('password') ?? ''))) return NextResponse.redirect(new URL('/admin/login?error=1', req.url), 303)
  const res = NextResponse.redirect(new URL('/admin', req.url), 303)
  res.cookies.set(ADMIN_COOKIE, signToken({ admin: true }, 60 * 60 * 12), cookieOptions(60 * 60 * 12))
  return res
}
