import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { sendEmail, siteUrl, emailShell, button } from '@/lib/email'

/** Iscrizione alla newsletter con conferma via email (double opt-in). */
export async function POST(req: Request) {
  const form = await req.formData()
  if (String(form.get('website') ?? '')) return NextResponse.redirect(new URL('/newsletter?status=pending', req.url), 303) // trappola anti-bot
  const parsed = z.string().email().safeParse(String(form.get('email') ?? '').trim().toLowerCase())
  if (!parsed.success) return NextResponse.redirect(new URL('/newsletter?status=invalid', req.url), 303)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const sub = await db.subscriber.upsert({
    where: { email: parsed.data },
    update: { unsubscribedAt: null },
    create: { email: parsed.data, source: 'footer', consentAt: new Date(), consentIp: ip },
  })
  if (!sub.confirmedAt) {
    const link = `${siteUrl()}/api/newsletter/confirm?t=${signToken({ sub: sub.id, act: 'confirm' }, 60 * 60 * 24 * 7)}`
    await sendEmail({
      to: sub.email,
      subject: 'Confirm your subscription to Cryptodroply',
      html: emailShell(`<h2>One more step</h2><p>Confirm your email to get new tools, airdrops and guides from Cryptodroply.</p>${button(link, 'Confirm my email')}<p style="font-size:13px;color:#666">If you did not ask for this, ignore this email and nothing will happen.</p>`),
    }).catch(() => false)
  }
  return NextResponse.redirect(new URL(`/newsletter?status=${sub.confirmedAt ? 'already' : 'pending'}`, req.url), 303)
}
