import { NextResponse, type NextRequest } from 'next/server'

/** Qualsiasi pagina con ?ref=CODICE memorizza il referral per 30 giorni solo se l'utente ha dato il consenso cookie (il codice si verifica alla registrazione). */
export function middleware(req: NextRequest) {
  // cryptodroply.com (senza www) porta sempre a www.cryptodroply.com: un solo indirizzo per Google e per i link
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0]
  if (host === 'cryptodroply.com') return NextResponse.redirect(`https://www.cryptodroply.com${req.nextUrl.pathname}${req.nextUrl.search}`, 308)
  const ref = req.nextUrl.searchParams.get('ref')
  const headers = new Headers(req.headers)
  headers.set('x-pathname', req.nextUrl.pathname + req.nextUrl.search)
  const res = NextResponse.next({ request: { headers } })
  if (ref && req.cookies.get('cd_consent')?.value === 'yes' && /^[a-z0-9]{6,20}$/i.test(ref)) {
    res.cookies.set('cd_ref', ref.toLowerCase(), { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', httpOnly: true, secure: true })
  }
  return res
}

export const config = { matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'] }
