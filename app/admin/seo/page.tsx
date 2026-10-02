import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { generateSeoDrafts } from '@/lib/seo-pages'
import { runSocialForSeoPage } from '@/lib/ai-content'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function generate() {
  'use server'
  await requireAdmin()
  const r = await generateSeoDrafts()
  revalidatePath('/admin/seo')
  redirect(`/admin/seo?msg=${encodeURIComponent(`${r.created} drafts created`)}`)
}
async function clearDrafts() {
  'use server'
  await requireAdmin()
  const r = await db.seoPage.deleteMany({ where: { status: { not: 'PUBLISHED' } } })
  revalidatePath('/admin/seo')
  redirect(`/admin/seo?msg=${encodeURIComponent(`${r.count} drafts deleted`)}`)
}
async function save(fd: FormData) {
  'use server'
  await requireAdmin()
  const act = String(fd.get('act'))
  const id = String(fd.get('id'))
  if (act === 'delete') await db.seoPage.delete({ where: { id } }).catch(() => undefined)
  else await db.seoPage.update({
    where: { id },
    data: {
      title: String(fd.get('title')), metaDescription: String(fd.get('metaDescription')), intro: String(fd.get('intro')),
      ...(act === 'publish' || act === 'publish-social' ? { status: 'PUBLISHED' } : act === 'unpublish' ? { status: 'DRAFT' } : {}),
    },
  })
  let msg = ''
  if (act === 'publish' || act === 'publish-social' || act === 'social') {
    const slug = (await db.seoPage.findUnique({ where: { id }, select: { slug: true } }))?.slug
    msg = act === 'social' ? '' : 'Published'
    if (slug && act !== 'publish') {
      try { msg += (msg ? '. ' : '') + (await runSocialForSeoPage(slug)) } catch (e) { msg += (msg ? '. ' : '') + `Publer error: ${(e as Error).message}` }
    }
  }
  revalidatePath('/admin/seo')
  if (msg) redirect(`/admin/seo?msg=${encodeURIComponent(msg.slice(0, 300))}`)
}

export default async function AdminSeo({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams
  await requireAdmin()
  const pages = await db.seoPage.findMany({ orderBy: [{ status: 'asc' }, { title: 'asc' }] })
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>SEO pages</h1>
      <AdminNav />
      <p>Pages like "Best wallets" built from your tools. They start as drafts: read and improve the text, then publish. Published pages are listed at <a href="/best">/best</a> and in the sitemap.</p>
      {msg && <p style={{ background: '#fff', padding: '12px 16px', borderRadius: 14, fontWeight: 600 }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <form action={generate}><button className="btn btn-sm">Generate drafts from the tools</button></form>
        <form action={clearDrafts}><button className="btn btn-sm">Delete all drafts</button></form>
      </div>
      <p>{pages.filter((p) => p.status === 'PUBLISHED').length} published, {pages.filter((p) => p.status !== 'PUBLISHED').length} drafts.</p>
      {pages.map((p) => (
        <form key={p.id} action={save} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: 'var(--shadow-1)' }}>
          <input type="hidden" name="id" value={p.id} />
          <b>{p.status}</b> · <a href={`/best/${p.slug}`} target="_blank" rel="noreferrer">/best/{p.slug}</a>
          <input name="title" defaultValue={p.title} style={{ width: '100%', padding: 8, margin: '8px 0' }} />
          <input name="metaDescription" defaultValue={p.metaDescription} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
          <textarea name="intro" defaultValue={p.intro} rows={5} style={{ width: '100%', padding: 8 }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button name="act" value="save" className="btn btn-sm">Save</button>
            {p.status === 'PUBLISHED'
              ? <button name="act" value="unpublish" className="btn btn-sm">Unpublish</button>
              : <button name="act" value="publish" className="btn btn-yellow btn-sm">Publish</button>}
            {p.status === 'PUBLISHED'
              ? <button name="act" value="social" className="btn btn-sm">Social drafts on Publer</button>
              : <button name="act" value="publish-social" className="btn btn-yellow btn-sm">Publish + drafts on Publer</button>}
            <button name="act" value="delete" className="btn btn-sm">Delete</button>
          </div>
        </form>
      ))}
    </div>
  )
}
