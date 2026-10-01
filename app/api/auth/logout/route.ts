import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: Request) {
  const res = NextResponse.redirect(absUrl('/', req), 303)
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
