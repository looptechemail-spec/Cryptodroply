import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { absUrl } from '@/lib/url'

export async function POST(req: Request) {
  if (!(await isAdmin())) return new Response('unauthorized', { status: 401 })
  const id = String((await req.formData()).get('id') ?? '')
  if (id) await db.formSubmission.update({ where: { id }, data: { handled: true } })
  return NextResponse.redirect(absUrl('/admin/messages', req), 303)
}
