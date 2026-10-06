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
  redirect(`/admin/seo?msg=${encodeURIComponent(`${r.created} bozze create`)}`)
}
async function clearDrafts() {
  'use server'
  await requireAdmin()
  const r = await db.seoPage.deleteMany({ where: { status: { not: 'PUBLISHED' } } })
  revalidatePath('/admin/seo')
  redirect(`/admin/seo?msg=${encodeURIComponent(`${r.count} bozze eliminate`)}`)
}
async function save(act: string, fd: FormData) {
  'use server'
  await requireAdmin()
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
    msg = act === 'social' ? '' : 'Pubblicata'
    if (slug && act !== 'publish') {
      try { msg += (msg ? '. ' : '') + (await runSocialForSeoPage(slug)) } catch (e) { msg += (msg ? '. ' : '') + `Errore Publer: ${(e as Error).message}` }
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
      <h1>Pagine SEO</h1>
      <AdminNav />
      <p>Pagine come "Best wallets" costruite a partire dai tuoi strumenti. Nascono come bozze: leggi e migliora il testo, poi pubblica. Le pagine pubblicate compaiono su <a href="/best">/best</a> e nella sitemap.</p>
      {msg && <p style={{ background: '#fff', padding: '12px 16px', borderRadius: 14, fontWeight: 600 }}>{msg}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <form action={generate}><button className="btn btn-sm">Genera bozze dagli strumenti</button></form>
        <form action={clearDrafts}><button className="btn btn-sm">Elimina tutte le bozze</button></form>
      </div>
      <p>{pages.filter((p) => p.status === 'PUBLISHED').length} pubblicate, {pages.filter((p) => p.status !== 'PUBLISHED').length} bozze.</p>
      {pages.map((p) => (
        <form key={p.id} action={save.bind(null, 'save')} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: 'var(--shadow-1)' }}>
          <input type="hidden" name="id" value={p.id} />
          <b>{p.status}</b> · <a href={`/best/${p.slug}`} target="_blank" rel="noreferrer">/best/{p.slug}</a>
          <input name="title" defaultValue={p.title} style={{ width: '100%', padding: 8, margin: '8px 0' }} />
          <input name="metaDescription" defaultValue={p.metaDescription} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
          <textarea name="intro" defaultValue={p.intro} rows={5} style={{ width: '100%', padding: 8 }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button formAction={save.bind(null, 'save')} className="btn btn-sm">Salva</button>
            {p.status === 'PUBLISHED'
              ? <button formAction={save.bind(null, 'unpublish')} className="btn btn-sm">Rimuovi dalla pubblicazione</button>
              : <button formAction={save.bind(null, 'publish')} className="btn btn-yellow btn-sm">Pubblica</button>}
            {p.status === 'PUBLISHED'
              ? <button formAction={save.bind(null, 'social')} className="btn btn-sm">Bozze social su Publer</button>
              : <button formAction={save.bind(null, 'publish-social')} className="btn btn-yellow btn-sm">Pubblica + bozze su Publer</button>}
            <button formAction={save.bind(null, 'delete')} className="btn btn-sm">Elimina</button>
          </div>
        </form>
      ))}
    </div>
  )
}
