import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { runWeeklyArticle, runWeeklyAnalysis } from '@/lib/ai-content'
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
    await db.jobRun.create({ data: { key: `manual-article-new-${Date.now()}`, note: `Bozza creata: ${url}` } })
  } catch (e) {
    await db.jobRun.create({ data: { key: `manual-article-new-${Date.now()}`, note: `ERRORE: ${(e as Error).message}` } })
  }
  revalidatePath('/admin/articles')
}

async function createAnalysis(fd: FormData) {
  'use server'
  await requireAdmin()
  const project = String(fd.get('project') ?? '').trim()
  const notes = String(fd.get('notes') ?? '').trim()
  const coverUrl = String(fd.get('coverUrl') ?? '').trim()
  // la copertina si legge subito: il lavoro lungo continua in secondo piano
  let cover: { size: number; type: string; arrayBuffer: () => Promise<ArrayBuffer> } | null = null
  const f = fd.get('cover')
  if (f && typeof f === 'object' && 'arrayBuffer' in f && (f as File).size > 0) {
    const buf = await (f as File).arrayBuffer()
    cover = { size: buf.byteLength, type: (f as File).type, arrayBuffer: async () => buf }
  }
  if (project.length < 2) redirect(`/admin/articles?r=${encodeURIComponent('ERRORE: scrivi il nome del progetto')}`)
  const key = `manual-article-analysis-${Date.now()}`
  await db.jobRun.create({ data: { key, note: `Sto scrivendo l’analisi di ${project}... (da 3 a 5 minuti, ricarica la pagina per vederla)` } })
  console.log(`[analysis] start: ${project}`)
  void (async () => {
    try {
      const r = await runWeeklyAnalysis(project, notes)
      console.log(`[analysis] done: ${r.title}`)
      let extra = ''
      try { if (cover || coverUrl) { await saveCover(r.id, cover, coverUrl); extra = ' Copertina aggiunta.' } } catch (e) { extra = ` Copertina non aggiunta (${(e as Error).message}).` }
      await db.jobRun.update({ where: { key }, data: { note: `Bozza dell’analisi pronta: "${r.title}". La trovi nelle bozze qui sotto (PRO).${extra}`.slice(0, 400) } })
    } catch (e) {
      console.error(`[analysis] failed: ${(e as Error).message}`)
      await db.jobRun.update({ where: { key }, data: { note: `ERRORE nella scrittura dell’analisi di ${project}: ${(e as Error).message}`.slice(0, 400) } }).catch(() => undefined)
    }
  })()
  revalidatePath('/admin/articles')
  redirect(`/admin/articles?r=${encodeURIComponent(`Avviato: l’analisi di ${project} è in scrittura. Servono da 3 a 5 minuti. Ricarica la pagina: il risultato compare nell’elenco qui sotto.`)}`)
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
      note = 'Bozza eliminata'
    } else if (what === 'save') note = `Salvato: ${String(fd.get('title')).slice(0, 60)}`
  } catch (e) {
    note = `ERRORE: ${(e as Error).message}`
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
    db.post.findMany({ where: { status: 'DRAFT' }, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 40, include: { translations: true } }),
    db.jobRun.findMany({ where: { key: { startsWith: 'manual-article' } }, orderBy: { ranAt: 'desc' }, take: 8 }),
  ])
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Articoli</h1>
      <AdminNav />
      {r && (
        <p role="status" style={{ padding: '12px 16px', borderRadius: 12, fontWeight: 700, background: r.startsWith('ERR') ? '#fde8e8' : '#e6f6ea', color: r.startsWith('ERR') ? '#a11' : '#145a2a' }}>{r}</p>
      )}
      <p>
        Ogni lunedì mattina (dalle 09:00, ora di Roma) qui viene scritta una nuova bozza di articolo. Puoi scriverne una anche adesso.
        Ogni articolo ha bisogno di un’immagine di copertina. Poi pubblicalo subito oppure scegli giorno e ora (ora di Roma) e uscirà da solo.
        Puoi anche chiedere di programmare su Publer i post per X, Telegram e Facebook nello stesso momento.
      </p>
      <form action={create} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        <input name="topic" placeholder="argomento (facoltativo)" style={{ padding: 8, minWidth: 260 }} />
        <button className="btn btn-yellow btn-sm">Scrivi una bozza adesso (richiede da 1 a 2 minuti)</button>
      </form>
      <form action={createAnalysis} encType="multipart/form-data" style={{ background: '#fff', borderRadius: 20, padding: 16, margin: '0 0 16px', boxShadow: 'var(--shadow-1)' }}>
        <b>Analisi settimanale (PRO)</b>
        <p style={{ margin: '6px 0 10px' }}>Scrivi l’analisi settimanale di un progetto, con la stessa struttura di quelle già pubblicate (dati base, team, tecnologia, scopo, tokenomics, staking, mercato, la mia opinione, consigli, segnali di allarme). Resta una bozza, solo PRO, nella categoria Weekly Crypto analysis. Aggiungi la copertina, controlla i numeri, poi pubblica.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input name="project" placeholder="Nome del progetto o ticker (es. ZIGChain)" required style={{ padding: 8, minWidth: 260 }} />
          <input name="notes" placeholder="note facoltative: link, taglio, cose da controllare" style={{ padding: 8, minWidth: 320, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' }}>
          <label>Copertina (facoltativa, puoi aggiungerla anche dopo) <input type="file" name="cover" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
          <input name="coverUrl" placeholder="oppure incolla l’indirizzo di un’immagine" style={{ padding: 8, minWidth: 240, flex: 1 }} />
        </div>
        <button className="btn btn-yellow btn-sm">Scrivi l’analisi (richiede da 3 a 5 minuti)</button>
      </form>
      {runs.length > 0 && (
        <ul>
          {runs.map((r) => <li key={r.key}>{r.ranAt.toISOString().slice(0, 16).replace('T', ' ')}: {r.note}</li>)}
        </ul>
      )}
      {drafts.length > 0 && <form action={deleteAllDrafts} style={{ marginBottom: 12 }}><button className="btn btn-sm">Elimina tutte le bozze degli articoli</button></form>}
      <p><a href="/admin/seo">Le pagine “migliori di” (SEO)</a> si gestiscono anche da qui.</p>
      {drafts.length === 0 && <p>Nessuna bozza.</p>}
      {drafts.map((p) => {
        const t = p.translations.find((x) => x.locale === 'EN')
        const it = p.translations.find((x) => x.locale === 'IT')
        return (
          <form key={p.id} action={act.bind(null, 'save')} encType="multipart/form-data" style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-1)' }}>
            <input type="hidden" name="id" value={p.id} />
            <small>/post/{p.slug} · creato il {p.createdAt.toISOString().slice(0, 10)}</small>{p.access === 'PRO' && <span style={{ background: '#FFD300', borderRadius: 999, padding: '2px 10px', fontWeight: 800, fontSize: 12, marginLeft: 8 }}>Analisi PRO</span>}
            {p.scheduledAt && (
              <p style={{ margin: '8px 0', fontWeight: 700, color: 'var(--blue)' }}>
                Programmato: esce il {dateToRome(p.scheduledAt).replace('T', ' alle ')} (ora di Roma)
              </p>
            )}
            <input name="title" defaultValue={t?.title ?? ''} style={{ width: '100%', padding: 10, margin: '8px 0', fontWeight: 700 }} />
            <input name="excerpt" defaultValue={t?.excerpt ?? ''} style={{ width: '100%', padding: 10, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 12px' }}>
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="Copertina" style={{ width: 200, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12 }} />
              ) : (
                <span style={{ width: 200, aspectRatio: '16 / 9', borderRadius: 12, background: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>Ancora nessuna copertina<br />(obbligatoria)</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 240 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Immagine di copertina</label>
                <input type="file" name="cover" accept="image/png,image/jpeg,image/webp,image/gif" />
                <input name="coverUrl" placeholder="oppure incolla l’indirizzo di un’immagine (https://...)" style={{ padding: 8 }} />
                <small style={{ color: 'var(--muted)' }}>Misura ideale 1600 x 900 px (16:9), fino a 6 MB. Premi Salva per tenerla.</small>
              </div>
            </div>
            <details>
              <summary>Leggi l’articolo</summary>
              <div className="md" style={{ padding: '12px 0' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(t?.contentMd ?? '') }} />
            </details>
            {it ? (
              <>
                <details open>
                  <summary><b>Versione italiana (anteprima)</b></summary>
                  <input name="itTitle" defaultValue={it.title} style={{ width: '100%', padding: 10, margin: '8px 0', fontWeight: 700 }} />
                  <input name="itExcerpt" defaultValue={it.excerpt ?? ''} style={{ width: '100%', padding: 10, marginBottom: 8 }} />
                  <div className="md" style={{ padding: '12px 0' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(it.contentMd) }} />
                </details>
                <details>
                  <summary>Modifica il testo italiano (markdown)</summary>
                  <textarea name="itContentMd" defaultValue={it.contentMd} rows={20} style={{ width: '100%', padding: 10, margin: '8px 0', fontFamily: 'monospace' }} />
                </details>
              </>
            ) : (
              <p style={{ margin: '8px 0', color: 'var(--muted)', fontSize: 14 }}>Non c’è ancora una versione italiana. Premi “Traduci in italiano” per vederla, oppure viene creata da sola quando pubblichi.</p>
            )}
            <details>
              <summary>Modifica il testo (markdown)</summary>
              <textarea name="contentMd" defaultValue={t?.contentMd ?? ''} rows={20} style={{ width: '100%', padding: 10, margin: '8px 0', fontFamily: 'monospace' }} />
            </details>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 700 }}>
                Pubblica il (ora di Roma){' '}
                <input type="datetime-local" name="when" defaultValue={dateToRome(p.scheduledAt)} style={{ padding: 8 }} />
              </label>
              <label style={{ fontSize: 14 }}>
                <input type="checkbox" name="social" defaultChecked /> Programma anche i post su X, Telegram e Facebook su Publer
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button formAction={act.bind(null, 'save')} className="btn btn-sm">Salva</button>
              <button formAction={act.bind(null, 'translate')} className="btn btn-yellow btn-sm">{it ? 'Traduci di nuovo' : 'Traduci in italiano'} (circa 1 minuto)</button>
              <button formAction={act.bind(null, 'publish-now')} className="btn btn-blue btn-sm">Pubblica ora</button>
              <button formAction={act.bind(null, 'schedule')} className="btn btn-blue btn-sm">Programma per la data indicata sopra</button>
              {p.scheduledAt && <button formAction={act.bind(null, 'unschedule')} className="btn btn-sm">Annulla programmazione</button>}
              <button formAction={act.bind(null, 'delete')} className="btn btn-sm">Elimina bozza</button>
            </div>
          </form>
        )
      })}
    </div>
  )
}
