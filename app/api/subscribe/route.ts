import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

/**
 * Iscrizione alla newsletter dal footer.
 * TODO: double opt-in (email di conferma) quando c'è il provider email; per ora salva il consenso.
 */
export async function POST(req: Request) {
  const form = await req.formData()
  const parsed = z.string().email().safeParse(String(form.get('email') ?? '').trim().toLowerCase())
  if (!parsed.success) return NextResponse.redirect(new URL('/?subscribed=invalid', req.url), 303)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  await db.subscriber.upsert({
    where: { email: parsed.data },
    update: { unsubscribedAt: null },
    create: { email: parsed.data, source: 'footer', consentAt: new Date(), consentIp: ip },
  })
  return NextResponse.redirect(new URL('/?subscribed=1', req.url), 303)
}
