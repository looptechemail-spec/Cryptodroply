import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { adminPasswordOk } from '@/lib/admin'
import { ADMIN_COOKIE, cookieOptions, signToken } from '@/lib/auth'

export async function POST(req: Request) {
  const form = await req.formData()
  if (!process.env.ADMIN_PASSWORD) return NextResponse.redirect(absUrl('/admin/login?error=config', req), 303)
  if (!adminPasswordOk(String(form.get('password') ?? ''))) return NextResponse.redirect(absUrl('/admin/login?error=1', req), 303)
  const res = NextResponse.redirect(absUrl('/admin', req), 303)
  res.cookies.set(ADMIN_COOKIE, signToken({ admin: true }, 60 * 60 * 12), cookieOptions(60 * 60 * 12))
  return res
}
