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
    await analyzeProject(String(fd.get('url') ?? ''), String(fd.get('notes') ?? ''))
  } catch (e) {
    back(`ERRORE: ${(e as Error).message}`)
  }
  revalidatePath('/admin/import-project')
  back('Anteprima pronta qui sotto. Controllala, scegli la categoria e accetta.')
}

async function decide(mode: string, fd: FormData) {
  'use server'
  await requireAdmin()
  const id = String(fd.get('id'))
  if (mode === 'discard') { await discardPreview(id); back('Anteprima scartata') }
  let msg = ''
  try {
    let attributes: Record<string, string> = {}
    try { attributes = JSON.parse(String(fd.get('attributes') || '{}')) } catch { throw new Error('Il campo "Campi della categoria" non è un JSON valido') }
    const g = (k: string) => String(fd.get(k) ?? '')
    const path = await acceptPreview(id, {
      title: g('title'), categoryId: g('categoryId'), description: g('description'), fullDescription: g('fullDescription'),
      whatIs: g('whatIs'), howItWorks: g('howItWorks'), whenToUse: g('whenToUse'), tip: g('tip'), website: g('website'),
      logoUrl: g('logoUrl'), coverUrl: g('coverUrl'), attributes, publish: mode === 'publish',
    })
    msg = `Aggiunto: ${path}${mode === 'publish' ? '' : ' (salvato come bozza)'}`
  } catch (e) {
    msg = `ERRORE: ${(e as Error).message}`
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
      <h1>Importa progetto</h1>
      <AdminNav />
      <p>Incolla il sito di un progetto. Claude lo legge e prepara la scheda. Tu controlli l’anteprima, scegli la categoria esatta e accetti: solo allora viene aggiunta al sito.</p>
      {msg && <p className="notice" style={{ fontWeight: 700 }}>{msg}</p>}
      <form action={analyze} style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0 28px' }}>
        <input name="url" type="url" required placeholder="https://sito-del-progetto.com" style={{ padding: 10 }} />
        <textarea name="notes" rows={4} placeholder="Facoltativo: le tue istruzioni per la scheda. Ad esempio: mettilo in Hot Wallets, sottolinea che è open source, scrivi che l’app è gratuita, aggiungi che supporta l’italiano, usa un tono molto semplice, aggiungi il mio link referral..." style={{ padding: 10 }} />
        <div><button className="btn btn-yellow btn-sm">Prepara anteprima (circa un minuto)</button></div>
      </form>
      {previews.length === 0 && <p>Nessuna anteprima in attesa.</p>}
      {previews.map(({ id, p }) => {
        const cat = catInfo[p.categoryId]
        return (
          <form key={id} action={decide.bind(null, 'draft')} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: 'var(--shadow-1)' }}>
            <input type="hidden" name="id" value={id} />
            <small>Fonte: <a href={p.url} target="_blank" rel="noreferrer">{p.url}</a></small>
            <h2 style={{ margin: '8px 0 12px' }}>Anteprima</h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ width: 280 }}>
                <AppCard
                  tool={{ id, slug: 'preview', title: p.title, logoUrl: p.logoUrl || null, coverUrl: p.coverUrl || null, description: p.description, categorySlug: cat?.slug ?? '', categoryName: cat?.name ?? '' }}
                  base="#"
                />
                {p.coverUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.coverUrl} alt="" style={{ width: '100%', borderRadius: 12, marginTop: 12 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <p><b>Va in:</b> {cat ? `${cat.section} → ${cat.name}` : '—'} (cambia qui sotto)</p>
                <div className="md" style={{ fontSize: 15 }}>
                  <p>{p.fullDescription}</p>
                  <h4>Cos’è</h4><div dangerouslySetInnerHTML={{ __html: p.whatIs }} />
                  <h4>Come funziona</h4><div dangerouslySetInnerHTML={{ __html: p.howItWorks }} />
                  <h4>Quando usarlo</h4><div dangerouslySetInnerHTML={{ __html: p.whenToUse }} />
                </div>
              </div>
            </div>
            <details style={{ marginTop: 12 }} open>
              <summary><b>Dove metterlo e cosa cambiare</b></summary>
              <label style={{ fontWeight: 700, fontSize: 14 }}>Sezione e categoria</label>
              <select name="categoryId" defaultValue={p.categoryId} style={box}>
                {groups.map((g) => (
                  <optgroup key={g.section.key} label={g.section.title + (g.section.pro ? ' (PRO)' : '')}>
                    {g.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <label style={{ fontWeight: 700, fontSize: 14 }}>Nome</label>
              <input name="title" defaultValue={p.title} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Descrizione breve</label>
              <input name="description" defaultValue={p.description} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Descrizione completa</label>
              <textarea name="fullDescription" defaultValue={p.fullDescription} rows={3} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Cos’è (html)</label>
              <textarea name="whatIs" defaultValue={p.whatIs} rows={5} style={{ ...box, fontFamily: 'monospace' }} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Come funziona (html)</label>
              <textarea name="howItWorks" defaultValue={p.howItWorks} rows={6} style={{ ...box, fontFamily: 'monospace' }} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Quando usarlo (html)</label>
              <textarea name="whenToUse" defaultValue={p.whenToUse} rows={6} style={{ ...box, fontFamily: 'monospace' }} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Consiglio (due righe brevi)</label>
              <textarea name="tip" defaultValue={p.tip} rows={2} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Sito web</label>
              <input name="website" defaultValue={p.website} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Indirizzo del logo</label>
              <input name="logoUrl" defaultValue={p.logoUrl} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Indirizzo dell’immagine di copertina</label>
              <input name="coverUrl" defaultValue={p.coverUrl} style={box} />
              <label style={{ fontWeight: 700, fontSize: 14 }}>Campi della categoria (JSON, guidano tag e filtri)</label>
              <textarea name="attributes" defaultValue={JSON.stringify(p.attributes, null, 2)} rows={5} style={{ ...box, fontFamily: 'monospace' }} />
            </details>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button formAction={decide.bind(null, 'publish')} className="btn btn-blue btn-sm">Accetta e pubblica</button>
              <button formAction={decide.bind(null, 'draft')} className="btn btn-sm">Accetta come bozza</button>
              <button formAction={decide.bind(null, 'discard')} className="btn btn-sm">Scarta</button>
            </div>
          </form>
        )
      })}
    </div>
  )
}
