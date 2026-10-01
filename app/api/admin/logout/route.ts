import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { ADMIN_COOKIE } from '@/lib/auth'

export async function POST(req: Request) {
  const res = NextResponse.redirect(absUrl('/admin/login', req), 303)
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
