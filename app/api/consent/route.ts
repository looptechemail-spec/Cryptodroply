import { NextResponse } from 'next/server'

/** Dopo il consenso, salva il referral in attesa (il codice arriva dal banner, mai prima del consenso). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const res = NextResponse.json({ ok: true })
  const ref = typeof body?.ref === 'string' ? body.ref : ''
  if (body?.consent === 'yes' && /^[a-z0-9]{6,20}$/i.test(ref)) {
    res.cookies.set('cd_ref', ref.toLowerCase(), { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', httpOnly: true, secure: true })
  }
  if (body?.consent === 'no') res.cookies.delete('cd_ref')
  return res
}
