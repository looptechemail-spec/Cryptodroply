import { NextResponse } from 'next/server'
import { isAdmin, getUser } from '@/lib/auth'
import { absUrl } from '@/lib/url'

/** Solo per admin: guarda il sito come un visitatore senza abbonamento (e torna indietro). */
export async function GET(req: Request) {
  const mode = new URL(req.url).searchParams.get('mode')
  const back = new URL(req.url).searchParams.get('back') ?? '/'
  const res = NextResponse.redirect(absUrl(back.startsWith('/') && !back.startsWith('//') ? back : '/', req), 302)
  const user = await getUser().catch(() => null)
  if ((await isAdmin()) || user?.role === 'ADMIN') {
    if (mode === 'visitor') res.cookies.set('cd_preview', 'visitor', { path: '/', httpOnly: true, sameSite: 'lax', secure: true, maxAge: 60 * 60 * 8 })
    else res.cookies.delete('cd_preview')
  }
  return res
}
