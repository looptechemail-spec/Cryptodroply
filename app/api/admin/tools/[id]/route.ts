import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { absUrl } from '@/lib/url'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response('unauthorized', { status: 401 })
  const { id } = await params
  const f = await req.formData()
  const s = (k: string) => String(f.get(k) ?? '').trim() || null
  const title = s('title')
  if (!title) return NextResponse.redirect(absUrl(`/admin/tools/${id}`, req), 303)
  await db.tool.update({
    where: { id },
    data: {
      title, refLink: s('refLink'), websiteUrl: s('websiteUrl'), logoUrl: s('logoUrl'),
      status: f.get('status') === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      featured: f.get('featured') === 'on', sponsored: f.get('sponsored') === 'on',
    },
  })
  const description = s('description')
  if (description !== null) {
    await db.toolTranslation.upsert({
      where: { toolId_locale: { toolId: id, locale: 'EN' } },
      update: { description }, create: { toolId: id, locale: 'EN', description },
    })
  }
  return NextResponse.redirect(absUrl('/admin/tools', req), 303)
}
