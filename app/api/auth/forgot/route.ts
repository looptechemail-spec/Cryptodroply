import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { siteUrl } from '@/lib/email'
import { sendFlow } from '@/lib/email-gate'
import { tplReset } from '@/lib/email-templates'

export async function POST(req: Request) {
  const form = await req.formData()
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const user = email ? await db.user.findUnique({ where: { email } }) : null
  if (user?.passwordHash) {
    // il token è legato alla password attuale: dopo il cambio non vale più
    const token = signToken({ uid: user.id, act: 'reset', pw: user.passwordHash.slice(-12) }, 60 * 60)
    await sendFlow('password-reset', { to: user.email, ...tplReset(`${siteUrl()}/reset?t=${token}`) }).catch(() => false)
  }
  // stessa risposta in ogni caso, per non svelare quali email sono registrate
  return NextResponse.redirect(absUrl('/forgot?sent=1', req), 303)
}
