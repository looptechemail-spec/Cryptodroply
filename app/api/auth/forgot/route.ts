import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { sendEmail, siteUrl, emailShell, button } from '@/lib/email'

export async function POST(req: Request) {
  const form = await req.formData()
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const user = email ? await db.user.findUnique({ where: { email } }) : null
  if (user?.passwordHash) {
    // il token è legato alla password attuale: dopo il cambio non vale più
    const token = signToken({ uid: user.id, act: 'reset', pw: user.passwordHash.slice(-12) }, 60 * 60)
    await sendEmail({
      to: user.email,
      subject: 'Reset your Cryptodroply password',
      html: emailShell(`<h2>Reset your password</h2><p>Use the button below within one hour.</p>${button(`${siteUrl()}/reset?t=${token}`, 'Choose a new password')}<p style="font-size:13px;color:#666">If you did not ask for this, ignore this email.</p>`),
    }).catch(() => false)
  }
  // stessa risposta in ogni caso, per non svelare quali email sono registrate
  return NextResponse.redirect(absUrl('/forgot?sent=1', req), 303)
}
