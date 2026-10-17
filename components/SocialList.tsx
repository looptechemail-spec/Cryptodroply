import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { dateToRome } from '@/lib/time'
import { saveGroup } from '@/lib/social-actions'

const CH: Record<string, string> = { x: 'X', telegram: 'Telegram', facebook: 'Facebook' }
const ORDER = ['x', 'telegram', 'facebook']
const SOURCE: Record<string, string> = { tool: 'Strumento', news: 'News', article: 'Articolo' }

type Row = Awaited<ReturnType<typeof db.socialPost.findMany>>[number]

/**
 * Elenco dei contenuti: ogni contenuto è UN solo blocco con i testi X, Telegram e Facebook.
 * Senza `source` mostra tutte le origini (con l'etichetta); `back` è la pagina a cui tornare dopo l'azione; `where` restringe l'elenco (es. una settimana).
 */
export async function SocialList({ source, view, back, where, take = 150 }: { source?: string; view: string; back?: string; where?: Prisma.SocialPostWhereInput; take?: number }) {
  const rows = await db.socialPost.findMany({
    where: { AND: [{ ...(source ? { source } : {}), status: view === 'sent' ? 'PUBLER' : 'DRAFT' }, where ?? {}] },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take,
  })
  if (!rows.length) return <p>Non c’è ancora nulla qui.</p>
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const key = r.batch ?? `${r.linkUrl ?? ''}|${r.scheduledAt?.toISOString() ?? ''}|${r.createdAt.toISOString().slice(0, 16)}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return (
    <>
      {[...groups.entries()].map(([key, list]) => {
        list.sort((a, b) => ORDER.indexOf(a.channel) - ORDER.indexOf(b.channel))
        const first = list[0]
        const sent = view === 'sent'
        return (
          <form key={key} action={saveGroup.bind(null, 'save')} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-1)' }}>
            <input type="hidden" name="ids" value={list.map((r) => r.id).join(',')} />
            {back && <input type="hidden" name="back" value={back} />}
            {!source && <div style={{ marginBottom: 8 }}><span style={{ background: 'var(--tint)', borderRadius: 999, padding: '2px 10px', fontWeight: 800, fontSize: 12 }}>{SOURCE[first.source] ?? first.source}</span></div>}
            {first.linkUrl && <div style={{ marginBottom: 8 }}>Link: <a href={first.linkUrl} target="_blank" rel="noreferrer">{first.linkUrl}</a></div>}
            {list.map((r) => (
              <div key={r.id} style={{ marginBottom: 10 }}>
                <b>{CH[r.channel] ?? r.channel}</b>{' '}
                <small style={{ color: r.channel === 'x' && r.text.length > 280 ? '#b00020' : 'var(--muted)' }}>{r.text.length} caratteri{r.channel === 'x' ? ' (X: max 280)' : ''}</small>
                {r.publerRef && <div style={{ fontSize: 13, color: r.publerRef.startsWith('ERR') ? '#b00020' : 'var(--muted)' }}>Publer: {r.publerRef}</div>}
                {sent
                  ? <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{r.text}</p>
                  : <textarea name={`text_${r.id}`} defaultValue={r.text} rows={r.channel === 'x' ? 4 : 5} style={{ width: '100%', padding: 10, marginTop: 4 }} />}
              </div>
            ))}
            {sent ? (
              <small>{first.scheduledAt ? `Data: ${dateToRome(first.scheduledAt).replace('T', ' ')} (Roma)` : ''}</small>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <label>Data e ora (Roma) <input type="datetime-local" name="scheduledAt" defaultValue={dateToRome(first.scheduledAt)} /></label>
                <button formAction={saveGroup.bind(null, 'save')} className="btn btn-sm">Salva</button>
                <button formAction={saveGroup.bind(null, 'publish-now')} className="btn btn-blue btn-sm">Pubblica ora su X, Telegram e Facebook</button>
                <button formAction={saveGroup.bind(null, 'schedule')} className="btn btn-yellow btn-sm">Programma su tutti e tre</button>
                <button formAction={saveGroup.bind(null, 'draft')} className="btn btn-sm">Bozza su Publer</button>
                <button formAction={saveGroup.bind(null, 'discard')} className="btn btn-sm">Scarta</button>
              </div>
            )}
          </form>
        )
      })}
    </>
  )
}
