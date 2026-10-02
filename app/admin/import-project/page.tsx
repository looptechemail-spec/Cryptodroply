import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { analyzeProject, pendingPreviews, discardPreview, acceptPreview, categoriesBySection } from '@/lib/import-project'
import { AppCard } from '@/components/AppCard'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const back = (msg: string) => redirect(`/admin/import-project?msg=${encodeURIComponent(msg.slice(0, 300))}`)

async function analyze(fd: FormData) {
  'use server'
  await requireAdmin()
  try {
    await analyzeProject(String(fd.get('url') ?? ''))
  } catch (e) {
    back(`ERROR: ${(e as Error).message}`)
  }
  revalidatePath('/admin/import-project')
  back('Preview ready below. Check it, choose the category and accept.')
}

async function decide(fd: FormData) {
  'use server'
  await requireAdmin()
  const id = String(fd.get('id'))
  const act = String(fd.get('act'))
  if (act === 'discard') { await discardPreview(id); back('Preview discarded') }
  let msg = ''
  try {
    let attributes: Record<string, string> = {}
    try { attributes = JSON.parse(String(fd.get('attributes') || '{}')) } catch { throw new Error('Il campo "Fields" non è un JSON valido') }
    const g = (k: string) => String(fd.get(k) ?? '')
    const path = await acceptPreview(id, {
      title: g('title'), categoryId: g('categoryId'), description: g('description'), fullDescription: g('fullDescription'),
      whatIs: g('whatIs'), howItWorks: g('howItWorks'), whenToUse: g('whenToUse'), tip: g('tip'), website: g('website'),
      logoUrl: g('logoUrl'), coverUrl: g('coverUrl'), attributes, publish: g('publish') === '1',
    })
    msg = `Added: ${path}${g('publish') === '1' ? '' : ' (saved as draft)'}`
  } catch (e) {
    msg = `ERROR: ${(e as Error).message}`
  }
  revalidatePath('/admin/import-project')
  back(msg)
}

const box = { width: '100%', padding: 8, marginBottom: 8 } as const

export default async function ImportProject({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireAdmin()
  const { msg } = await searchParams
  const [previews, groups] = await Promise.all([pendingPreviews(), categoriesBySection()])
  const catInfo = Object.fromEntries(groups.flatMap((g) => g.cats.map((c) => [c.id, { ...c, section: g.section.title }])))
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Import project</h1>
      <AdminNav />
      <p>Paste the website of a project. Claude reads it and prepares a listing. You check the preview, pick the exact category and accept: only then it is added to the site.</p>
      {msg && <p className="notice" style={{ fontWeight: 700 }}>{msg}</p>}
      <form action={analyze} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 28px' }}>
        <input name="url" type="url" required placeholder="https://project-website.com" style={{ padding: 10, minWidth: 320, flex: 1 }} />
        <button className="btn btn-yellow btn-sm">Prepare preview (takes about a minute)</button>
      </form>
      {previews.length === 0 && <p>No previews waiting.</p>}
      {previews.map(({ id, p }) => {
        const cat = catInfo[p.categoryId]
        return (
          <form key={id} action={decide} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: 'var(--shadow-1)' }}>
            <input type="hidden" name="id" value={id} />
            <small>Source: <a href={p.url} target="_blank" rel="noreferrer">{p.url}</a></small>
            <h2 style={{ margin: '8px 0 12px' }}>Preview</h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ width: 280 }}>
                <AppCard
                  tool={{ id, slug: 'preview', title: p.title, logoUrl: p.logoUrl || null, coverUrl: p.coverUrl || null, description: p.description, categorySlug: cat?.slug ?? '', categoryName: cat?.name ?? '' }}
                  base="#"
                />
                {p.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.coverUrl} alt="" style={{ width: '100%', borderRadius: 12, marginTop: 12 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <p><b>Goes into:</b> {cat ? `${cat.section} → ${cat.name}` : '—'} (change below)</p>
                <div className="md" style={{ fontSize: 15 }}>
                  <p>{p.fullDescription}</p>
                  <h4>What is it</h4><div dangerouslySetInnerHTML={{ __html: p.whatIs }} />
                  <h4>How it works</h4><div dangerouslySetInnerHTML={{ __html: p.howItWorks }} />
                  <h4>When to use it</h4><div dangerouslySetInnerHTML={{ __html: p.whenToUse }} />
                </div>
              </div>
            </div>
            <details style={{ marginTop: 12 }} open>
              <summary><b>Where to put it and what to change</b></summary>
              <label style={{ fontWeight: 700, fontSize: 14 }}>Section and category</label>
              <select name="categoryId" defaultValue={p.categoryId} style={box}>
                {groups.map((g) => (
                  <optgroup key={g.section.key} label={g.section.title + (g.section.pro ? ' (PRO)' : '')}>
                    {g.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <label style={{ fontWeight: 700, fontSize: 14 }}>Name</label>
              <input name="title" defaultValue={p.title} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Short description</label>
              <input name="description" defaultValue={p.description} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Full description</label>
              <textarea name="fullDescription" defaultValue={p.fullDescription} rows={3} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>What is it (html)</label>
              <textarea name="whatIs" defaultValue={p.whatIs} rows={5} style={{ ...box, fontFamily: 'monospace' }} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>How it works (html)</label>
              <textarea name="howItWorks" defaultValue={p.howItWorks} rows={6} style={{ ...box, fontFamily: 'monospace' }} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>When to use it (html)</label>
              <textarea name="whenToUse" defaultValue={p.whenToUse} rows={6} style={{ ...box, fontFamily: 'monospace' }} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Tip (two short lines)</label>
              <textarea name="tip" defaultValue={p.tip} rows={2} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Website</label>
              <input name="website" defaultValue={p.website} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Logo address</label>
              <input name="logoUrl" defaultValue={p.logoUrl} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Cover image address</label>
              <input name="coverUrl" defaultValue={p.coverUrl} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Fields of the category (JSON, they drive the tags and filters)</label>
              <textarea name="attributes" defaultValue={JSON.stringify(p.attributes, null, 2)} rows={5} style={{ ...box, fontFamily: 'monospace' }} />
            </details>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button name="publish" value="1" className="btn btn-blue btn-sm" formAction={decide}>Accept and publish</button>
              <button name="publish" value="0" className="btn btn-sm">Accept as draft</button>
              <button name="act" value="discard" className="btn btn-sm">Discard</button>
            </div>
          </form>
        )
      })}
    </div>
  )
}
