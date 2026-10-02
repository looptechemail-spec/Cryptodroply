import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { publishArticle, runWeeklyArticle } from '@/lib/ai-content'
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

async function act(fd: FormData) {
  'use server'
  await requireAdmin()
  const id = String(fd.get('id'))
  const what = String(fd.get('act'))
  const post = await db.post.findUnique({ where: { id }, include: { translations: true } })
  if (!post) return
  const t = post.translations.find((x) => x.locale === 'EN')
  if (t && what !== 'delete') {
    await db.postTranslation.update({ where: { id: t.id }, data: { title: String(fd.get('title')), excerpt: String(fd.get('excerpt')), contentMd: String(fd.get('contentMd')) } })
  }
  let note = ''
  try {
    if (what === 'publish-tue') note = await publishArticle(id, 'tue')
    else if (what === 'publish-thu') note = await publishArticle(id, 'thu')
    else if (what === 'publish') note = await publishArticle(id, null)
    else if (what === 'delete' && post.status === 'DRAFT') {
      await db.postTranslation.deleteMany({ where: { postId: id } })
      await db.post.delete({ where: { id } })
      note = 'Draft deleted'
    }
  } catch (e) {
    note = `ERROR: ${(e as Error).message}`
  }
  if (note) await db.jobRun.create({ data: { key: `manual-article-${what}-${Date.now()}`, note: note.slice(0, 300) } })
  revalidatePath('/admin/articles')
}

export default async function Articles() {
  await requireAdmin()
  const [drafts, runs] = await Promise.all([
    db.post.findMany({ where: { status: 'DRAFT' }, orderBy: { createdAt: 'desc' }, take: 15, include: { translations: true } }),
    db.jobRun.findMany({ where: { key: { startsWith: 'manual-article' } }, orderBy: { ranAt: 'desc' }, take: 6 }),
  ])
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Articles</h1>
      <AdminNav />
      <p>
        Every Monday morning (from 09:00, Rome time) a new article draft is written here. You can also write one now.
        When you confirm a draft it goes live and its X, Telegram and Facebook posts are scheduled on Publer for the Tuesday or Thursday you pick, at 10:00.
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
      {drafts.length === 0 && <p>No drafts.</p>}
      {drafts.map((p) => {
        const t = p.translations.find((x) => x.locale === 'EN')
        return (
          <form key={p.id} action={act} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-1)' }}>
            <input type="hidden" name="id" value={p.id} />
            <small>/post/{p.slug} · created {p.createdAt.toISOString().slice(0, 10)}</small>
            <input name="title" defaultValue={t?.title ?? ''} style={{ width: '100%', padding: 10, margin: '8px 0', fontWeight: 700 }} />
            <input name="excerpt" defaultValue={t?.excerpt ?? ''} style={{ width: '100%', padding: 10, marginBottom: 8 }} />
            <details>
              <summary>Read the article</summary>
              <div className="md" style={{ padding: '12px 0' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(t?.contentMd ?? '') }} />
            </details>
            <details>
              <summary>Edit the text (markdown)</summary>
              <textarea name="contentMd" defaultValue={t?.contentMd ?? ''} rows={20} style={{ width: '100%', padding: 10, margin: '8px 0', fontFamily: 'monospace' }} />
            </details>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button name="act" value="save" className="btn btn-sm">Save</button>
              <button name="act" value="publish-tue" className="btn btn-blue btn-sm">Publish + schedule on Tuesday</button>
              <button name="act" value="publish-thu" className="btn btn-blue btn-sm">Publish + schedule on Thursday</button>
              <button name="act" value="publish" className="btn btn-sm">Publish only</button>
              <button name="act" value="delete" className="btn btn-sm">Delete draft</button>
            </div>
          </form>
        )
      })}
    </div>
  )
}
