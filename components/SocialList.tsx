import { db } from '@/lib/db'
import { dateToRome } from '@/lib/time'
import { savePost } from '@/lib/social-actions'

const CH: Record<string, string> = { x: 'X', telegram: 'Telegram', facebook: 'Facebook' }

/** Elenco dei post di una sezione: modifica, manda a Publer come bozza o programma. */
export async function SocialList({ source, view }: { source: string; view: string }) {
  const rows = await db.socialPost.findMany({
    where: { source, status: view === 'sent' ? 'PUBLER' : 'DRAFT' },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 120,
  })
  if (!rows.length) return <p>Nothing here.</p>
  return (
    <>
      {rows.map((r) => (
        <form key={r.id} action={savePost} style={{ background: '#fff', borderRadius: 20, padding: 20, marginBottom: 14, boxShadow: 'var(--shadow-1)' }}>
          <input type="hidden" name="id" value={r.id} />
          <b>{CH[r.channel] ?? r.channel}</b>{' '}
          {r.linkUrl && <a href={r.linkUrl} target="_blank" rel="noreferrer">link</a>}
          {r.publerRef && <div style={{ fontSize: 13, color: r.publerRef.startsWith('ERROR') ? '#b00020' : 'var(--muted)' }}>Publer: {r.publerRef}</div>}
          <textarea name="text" defaultValue={r.text} rows={5} style={{ width: '100%', padding: 10, margin: '10px 0' }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>Date and time (Rome) <input type="datetime-local" name="scheduledAt" defaultValue={dateToRome(r.scheduledAt)} /></label>
            <button name="act" value="save" className="btn btn-sm">Save</button>
            {r.status === 'DRAFT' && (
              <>
                <button name="act" value="publer-draft" className="btn btn-blue btn-sm">Send to Publer as draft</button>
                <button name="act" value="publer-schedule" className="btn btn-yellow btn-sm">Schedule on Publer</button>
                <button name="act" value="reject" className="btn btn-sm">Discard</button>
              </>
            )}
          </div>
        </form>
      ))}
    </>
  )
}
