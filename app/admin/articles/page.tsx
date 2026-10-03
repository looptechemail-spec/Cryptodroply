import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { runWeeklyArticle } from '@/lib/ai-content'
import { saveCover, publishNow, scheduleArticle, unscheduleArticle } from '@/lib/articles'
import { romeToDate, dateToRome } from '@/lib/time'
import { translatePost } from '@/lib/translate'
import { renderMarkdown } from '@/lib/markdown'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function create(fd: FormData) {
  'use server'
  await requireAdmin()
  const topic = String(fd.get('topic') ?? '').trim()
  try {
    const url = await runWeeklyArticle(topic || undefined)
    await db.jobRun.create({ data: { key: `manual-article-new-${Date.now()}`, note: `Draft created: ${url}` } })
  } catch (e) {
    await db.jobRun.create({ data: { key: `manual-article-new-${Date.now()}`, note: `ERROR: ${(e as Error).message}` } })
  }
  revalidatePath('/admin/articles')
}

async function deleteAllDrafts() {
  'use server'
  await requireAdmin()
  const ids = (await db.post.findMany({ where: { status: 'DRAFT' }, select: { id: true } })).map((x) => x.id)
  await db.postTranslation.deleteMany({ where: { postId: { in: ids } } })
  await db.post.deleteMany({ where: { id: { in: ids } } })
  await db.jobRun.create({ data: { key: `manual-article-delete-all-${Date.now()}`, note: `Eliminate ${ids.length} bozze di articoli` } })
  revalidatePath('/admin/articles')
  redirect(`/admin/articles?r=${encodeURIComponent(`Eliminate ${ids.length} bozze di articoli`)}`)
}

async function act(what: string, fd: FormData) {
  'use server'
  await requireAdmin()
  const id = String(fd.get('id'))
  const post = await db.post.findUnique({ where: { id }, include: { translations: true } })
  if (!post) return
  const t = post.translations.find((x) => x.locale === 'EN')
  let note = ''
  try {
    if (t && what !== 'delete') {
      const contentMd = fd.get('contentMd')
      await db.postTranslation.update({ where: { id: t.id }, data: { title: String(fd.get('title') ?? t.title), excerpt: String(fd.get('excerpt') ?? t.excerpt ?? ''), ...(typeof contentMd === 'string' && contentMd ? { contentMd } : {}) } })
    }
    if (what !== 'delete') {
      const itId = post.translations.find((x) => x.locale === 'IT')?.id
      if (itId && typeof fd.get('itContentMd') === 'string') {
        await db.postTranslation.update({ where: { id: itId }, data: { title: String(fd.get('itTitle') ?? ''), excerpt: String(fd.get('itExcerpt') ?? ''), contentMd: String(fd.get('itContentMd')) } })
      }
      const file = fd.get('cover')
      await saveCover(id, file && typeof file === 'object' && 'arrayBuffer' in file ? (file as File) : null, String(fd.get('coverUrl') ?? ''))
    }
    const social = fd.get('social') === 'on'
    if (what === 'publish-now') note = await publishNow(id, social)
    else if (what === 'translate') {
      await translatePost(id)
      note = 'Versione italiana pronta: leggila qui sotto, correggila se serve e poi pubblica'
    } else if (what === 'schedule') {
      const when = String(fd.get('when') ?? '')
      if (!when) throw new Error('Scegli la data e l’ora di uscita')
      note = await scheduleArticle(id, romeToDate(when), social)
    } else if (what === 'unschedule') {
      await unscheduleArticle(id)
      note = 'Programmazione annullata (i post già mandati a Publer vanno tolti da Publer)'
    } else if (what === 'delete' && post.status === 'DRAFT') {
      await db.postTranslation.deleteMany({ where: { postId: id } })
      await db.post.delete({ where: { id } })
      note = 'Draft deleted'
    } else if (what === 'save') note = `Salvato: ${String(fd.get('title')).slice(0, 60)}`
  } catch (e) {
    note = `ERROR: ${(e as Error).message}`
  }
  if (!note) note = `Azione "${what}" eseguita`
  await db.jobRun.create({ data: { key: `manual-article-${what}-${Date.now()}`, note: note.slice(0, 300) } })
  revalidatePath('/admin/articles')
  revalidatePath('/blog')
  revalidatePath('/')
  redirect(`/admin/articles?r=${encodeURIComponent(note.slice(0, 300))}`)
}

export default async function Articles({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams
  await requireAdmin()
  const [drafts, runs] = await Promise.all([
    db.post.findMany({ where: { status: 'DRAFT' }, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 15, include: { translations: true } }),
    db.jobRun.findMany({ where: { key: { startsWith: 'manual-article' } }, orderBy: { ranAt: 'desc' }, take: 6 }),
  ])
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Articles</h1>
      <AdminNav />
      {r && (
        <p role="status" style={{ padding: '12px 16px', borderRadius: 12, fontWeight: 700, background: r.startsWith('ERROR') ? '#fde8e8' : '#e6f6ea', color: r.startsWith('ERROR') ? '#a11' : '#145a2a' }}>{r}</p>
      )}
      <p>
        Every Monday morning (from 09:00, Rome time) a new article draft is written here. You can also write one now.
        Every article needs a cover image. Then publish it now or choose the day and time (Rome time) and it goes live by itself.
        You can also ask for the X, Telegram and Facebook posts to be scheduled on Publer at the same moment.
      </p>
      <form action={create} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        <input name="topic" placeholder="optional topic" style={{ padding: 8, minWidth: 260 }} />
        <button className="btn btn-yellow btn-sm">Write a draft now (takes 1 to 2 minutes)</button>
      </form>
      {runs.length > 0 && (
        <ul>
          {runs.map((r) => <li key={r.key}>{r.ranAt.toISOString().slice(0, 16).replace('T', ' ')}: {r.note}</li>)}
        </ul>
      )}
      {drafts.length > 0 && <form action={deleteAllDrafts} style={{ marginBottom: 12 }}><button className="btn btn-sm">Delete all article drafts</button></form>}
      <p><a href="/admin/seo">Best-of pages (SEO)</a> are managed here too.</p>
      {drafts.length === 0 && <p>No drafts.</p>}
      {drafts.map((p) => {
        const t = p.translations.find((x) => x.locale === 'EN')
        const it = p.translations.find((x) => x.locale === 'IT')
        return (
          <form key={p.id} action={act.bind(null, 'save')} encType="multipart/form-data" style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-1)' }}>
            <input type="hidden" name="id" value={p.id} />
            <small>/post/{p.slug} · created {p.createdAt.toISOString().slice(0, 10)}</small>
            {p.scheduledAt && (
              <p style={{ margin: '8px 0', fontWeight: 700, color: 'var(--blue)' }}>
                Scheduled: goes live on {dateToRome(p.scheduledAt).replace('T', ' at ')} (Rome time)
              </p>
            )}
            <input name="title" defaultValue={t?.title ?? ''} style={{ width: '100%', padding: 10, margin: '8px 0', fontWeight: 700 }} />
            <input name="excerpt" defaultValue={t?.excerpt ?? ''} style={{ width: '100%', padding: 10, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 12px' }}>
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="Cover" style={{ width: 200, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12 }} />
              ) : (
                <span style={{ width: 200, aspectRatio: '16 / 9', borderRadius: 12, background: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>No cover yet<br />(required)</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Cover image</label>
                <input type="file" name="cover" accept="image/png,image/jpeg,image/webp,image/gif" />
                <input name="coverUrl" placeholder="or paste an image address (https://...)" style={{ padding: 8 }} />
                <small style={{ color: 'var(--muted)' }}>Best size 1600 x 900 px (16:9), up to 6 MB. Press Save to keep it.</small>
              </div>
            </div>
            <details>
              <summary>Read the article</summary>
              <div className="md" style={{ padding: '12px 0' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(t?.contentMd ?? '') }} />
            </details>
            {it ? (
              <>
                <details open>
                  <summary><b>Italian version (preview)</b></summary>
                  <input name="itTitle" defaultValue={it.title} style={{ width: '100%', padding: 10, margin: '8px 0', fontWeight: 700 }} />
                  <input name="itExcerpt" defaultValue={it.excerpt ?? ''} style={{ width: '100%', padding: 10, marginBottom: 8 }} />
                  <div className="md" style={{ padding: '12px 0' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(it.contentMd) }} />
                </details>
                <details>
                  <summary>Edit the Italian text (markdown)</summary>
                  <textarea name="itContentMd" defaultValue={it.contentMd} rows={20} style={{ width: '100%', padding: 10, margin: '8px 0', fontFamily: 'monospace' }} />
                </details>
              </>
            ) : (
              <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: 14 }}>No Italian version yet. Press “Translate to Italian” to see it, or it is created automatically when you publish.</p>
            )}
            <details>
              <summary>Edit the text (markdown)</summary>
              <textarea name="contentMd" defaultValue={t?.contentMd ?? ''} rows={20} style={{ width: '100%', padding: 10, margin: '8px 0', fontFamily: 'monospace' }} />
            </details>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 700 }}>
                Publish on (Rome time){' '}
                <input type="datetime-local" name="when" defaultValue={dateToRome(p.scheduledAt)} style={{ padding: 8 }} />
              </label>
              <label style={{ fontSize: 14 }}>
                <input type="checkbox" name="social" defaultChecked /> Also schedule X, Telegram and Facebook posts on Publer
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button formAction={act.bind(null, 'save')} className="btn btn-sm">Save</button>
              <button formAction={act.bind(null, 'translate')} className="btn btn-yellow btn-sm">{it ? 'Translate again' : 'Translate to Italian'} (about 1 minute)</button>
              <button formAction={act.bind(null, 'publish-now')} className="btn btn-blue btn-sm">Publish now</button>
              <button formAction={act.bind(null, 'schedule')} className="btn btn-blue btn-sm">Schedule for the date above</button>
              {p.scheduledAt && <button formAction={act.bind(null, 'unschedule')} className="btn btn-sm">Cancel schedule</button>}
              <button formAction={act.bind(null, 'delete')} className="btn btn-sm">Delete draft</button>
            </div>
          </form>
        )
      })}
    </div>
  )
}
