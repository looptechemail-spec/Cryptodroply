import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'

/** Link personale breve: cryptodroply.com/r/CODICE */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const res = NextResponse.redirect(absUrl('/', req), 302)
  if (/^[a-z0-9]{6,20}$/i.test(code)) {
    res.cookies.set('cd_ref', code.toLowerCase(), { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', httpOnly: true, secure: true })
  }
  return res
}
