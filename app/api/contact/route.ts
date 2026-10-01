import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'

const TYPES = { contact: 'CONTACT', project: 'LIST_PROJECT', collab: 'COLLAB' } as const

export async function POST(req: Request) {
  const form = await req.formData()
  if (String(form.get('website') ?? '')) return NextResponse.redirect(absUrl('/contact?sent=1', req), 303) // trappola anti-bot
  const parsed = z
    .object({
      name: z.string().trim().max(120),
      email: z.string().trim().toLowerCase().email(),
      topic: z.enum(['contact', 'project', 'collab']),
      message: z.string().trim().min(5).max(5000),
    })
    .safeParse({ name: form.get('name') ?? '', email: form.get('email') ?? '', topic: form.get('topic') ?? 'contact', message: form.get('message') ?? '' })
  if (!parsed.success) return NextResponse.redirect(absUrl('/contact?error=1', req), 303)

  const d = parsed.data
  await db.formSubmission.create({ data: { type: TYPES[d.topic], email: d.email, payload: { name: d.name, message: d.message } } })
  const to = process.env.CONTACT_TO ?? process.env.EMAIL_FROM
  if (to) {
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
    await sendEmail({ to, subject: `New message (${d.topic}) from ${d.name || d.email}`, html: `<p><b>${esc(d.name)}</b> &lt;${esc(d.email)}&gt;</p><p>${esc(d.message).replace(/\n/g, '<br>')}</p>` }).catch(() => false)
  }
  return NextResponse.redirect(absUrl('/contact?sent=1', req), 303)
}
