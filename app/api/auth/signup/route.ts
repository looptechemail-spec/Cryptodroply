import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { SESSION_COOKIE, cookieOptions, signToken } from '@/lib/auth'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().max(100).optional(),
  plan: z.string().optional(),
})

export async function POST(req: Request) {
  const form = await req.formData()
  const parsed = schema.safeParse({
    email: String(form.get('email') ?? '').trim().toLowerCase(),
    password: String(form.get('password') ?? ''),
    name: String(form.get('name') ?? '') || undefined,
    plan: String(form.get('plan') ?? '') || undefined,
  })
  const back = (err: string) => NextResponse.redirect(absUrl(`/signup?error=${err}${parsed.success && parsed.data.plan ? '&plan=' + parsed.data.plan : ''}`, req), 303)
  if (!parsed.success) return back('invalid')

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) return back('exists')

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    },
  })
  // chi si registra ha già accettato le condizioni: non iscriviamo alla newsletter senza un consenso esplicito.
  const res = NextResponse.redirect(absUrl(parsed.data.plan === 'pro' ? '/account?checkout=1' : '/account', req), 303)
  res.cookies.set(SESSION_COOKIE, signToken({ uid: user.id }, 60 * 60 * 24 * 30), cookieOptions(60 * 60 * 24 * 30))
  return res
}
