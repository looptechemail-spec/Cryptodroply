import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { youtubeEmbed } from '@/lib/content'

export const dynamic = 'force-dynamic'

async function addVideo(fd: FormData) {
  'use server'
  await requireAdmin()
  const toolId = String(fd.get('toolId'))
  const url = String(fd.get('url') ?? '').trim()
  if (!youtubeEmbed(url)) return
  let title = String(fd.get('title') ?? '').trim()
  let credit = String(fd.get('credit') ?? '').trim()
  if (!title || !credit) {
    // titolo e canale si leggono da YouTube se non li scrivi
    const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    if (o) { title ||= o.title; credit ||= o.author_name ? `Video created by ${o.author_name}` : '' }
  }
  const last = await db.toolVideo.findFirst({ where: { toolId }, orderBy: { sortOrder: 'desc' } })
  await db.toolVideo.create({
    data: { toolId, youtubeUrl: url, titleEn: title || null, description: credit || null, access: 'PRO', sortOrder: (last?.sortOrder ?? -1) + 1 },
  })
  const ref = String(fd.get('refLink') ?? '').trim()
  if (/^https?:\/\//.test(ref)) await db.tool.update({ where: { id: toolId }, data: { refLink: ref } })
  revalidatePath('/admin/videos')
}
async function removeVideo(fd: FormData) {
  'use server'
  await requireAdmin()
  await db.toolVideo.delete({ where: { id: String(fd.get('id')) } }).catch(() => undefined)
  revalidatePath('/admin/videos')
}

export default async function AdminVideos({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin()
  const q = ((await searchParams).q ?? '').trim()
  const include = { videos: { orderBy: { sortOrder: 'asc' as const } }, category: { select: { slug: true } } }
  const [waiting, found] = await Promise.all([
    db.tool.findMany({ where: { status: 'PUBLISHED', videos: { none: {} } }, orderBy: [{ createdAt: 'desc' }], take: 40, include }),
    q ? db.tool.findMany({ where: { title: { contains: q, mode: 'insensitive' } }, take: 20, include }) : Promise.resolve([]),
  ])
  const ids = new Set(found.map((t) => t.id))
  const list = [...found, ...waiting.filter((t) => !ids.has(t.id))]
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Tool videos</h1>
      <AdminNav />
      <p>Paste a YouTube link for a tool and press Add. It goes live on the tool page right away, for registered members. Title and channel are read from YouTube if you leave them empty. You can also set the referral link here.</p>
      <form style={{ display: 'flex', gap: 8, margin: '12px 0 20px' }}>
        <input name="q" defaultValue={q} placeholder="Find a tool by name" style={{ padding: 8, minWidth: 260 }} />
        <button className="btn btn-sm">Search</button>
      </form>
      <p style={{ color: 'var(--muted)' }}>{q ? `Results for "${q}", then` : 'Showing'} the newest tools without a video.</p>
      {list.map((t) => (
        <div key={t.id} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: 'var(--shadow-1)' }}>
          <b>{t.title}</b> · <a href={`/${t.category.slug}/${t.slug}`} target="_blank" rel="noreferrer">open page</a>
          {t.videos.map((v) => (
            <form key={v.id} action={removeVideo} style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '8px 0' }}>
              <input type="hidden" name="id" value={v.id} />
              <span>🎬 {v.titleEn ?? v.youtubeUrl}</span>
              <button className="btn btn-sm">Remove</button>
            </form>
          ))}
          <form action={addVideo} style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <input type="hidden" name="toolId" value={t.id} />
            <input name="url" placeholder="YouTube link" required style={{ padding: 8 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input name="title" placeholder="Title (optional)" style={{ padding: 8, flex: 1, minWidth: 200 }} />
              <input name="credit" placeholder="Credit, e.g. Video created by... (optional)" style={{ padding: 8, flex: 1, minWidth: 200 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input name="refLink" placeholder={t.refLink ? 'Referral link set, paste to replace' : 'Referral link (optional)'} style={{ padding: 8, flex: 1, minWidth: 200 }} />
              <button className="btn btn-yellow btn-sm">Add</button>
            </div>
          </form>
        </div>
      ))}
    </div>
  )
}
