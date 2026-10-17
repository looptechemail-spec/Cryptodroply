import Link from 'next/link'
import { pendingApprovals } from '@/lib/approvals'
import { SocialList } from './SocialList'
import { articleDecide, campaignSendNow, taskDecide } from '@/lib/approval-actions'
import { dateToRome } from '@/lib/time'

const card = { background: '#fff', borderRadius: 20, boxShadow: 'var(--shadow-1)', padding: 20, marginBottom: 14 } as const
const H = ({ children, n }: { children: React.ReactNode; n: number }) => (
  <h2 style={{ fontSize: 26, margin: '36px 0 12px' }}>{children} <span style={{ background: 'var(--tint)', borderRadius: 999, padding: '2px 12px', fontSize: 16 }}>{n}</span></h2>
)

export async function ApprovalQueue() {
  const q = await pendingApprovals()
  if (!q.total && !q.seo) return <p style={{ marginTop: 24 }}>Niente da approvare: è tutto a posto. ✅</p>
  return (
    <div>
      <H n={q.articles.length}>Articoli e analisi PRO</H>
      {!q.articles.length && <p style={{ color: 'var(--muted)' }}>Nessun articolo in bozza.</p>}
      {q.articles.map((a) => {
        const ok = !!a.cover && a.hasText
        return (
          <div key={a.id} style={card}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
              <span>{a.analysis ? '📊 Analisi PRO' : a.access === 'PRO' ? '💎 PRO' : '📰 Articolo'}</span>
              <span>{a.cover ? 'copertina ✅' : 'copertina ❌'}</span>
              <span>{a.scheduledAt ? `📅 ${dateToRome(a.scheduledAt).replace('T', ' alle ')}` : 'non programmato'}</span>
            </div>
            <h3 style={{ fontSize: 20, margin: '0 0 6px' }}>{a.title}</h3>
            {a.excerpt && <p style={{ color: 'var(--muted)', margin: '0 0 10px' }}>{a.excerpt}</p>}
            <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="hidden" name="id" value={a.id} />
              <input type="datetime-local" name="when" defaultValue={dateToRome(a.scheduledAt)} style={{ padding: 8 }} />
              {a.analysis
                ? <small style={{ color: 'var(--muted)' }}>Vuoto = martedì alle 10. Mai sui social.</small>
                : <label><input type="checkbox" name="social" defaultChecked /> con post social</label>}
              <button className="btn btn-sm" formAction={articleDecide.bind(null, 'schedule')} disabled={!ok}>Approva e programma</button>
              <button className="btn btn-outline-dark btn-sm" formAction={articleDecide.bind(null, 'publish')} disabled={!ok}>Pubblica ora</button>
              {a.scheduledAt && <button className="btn btn-outline-dark btn-sm" formAction={articleDecide.bind(null, 'unschedule')}>Togli programmazione</button>}
              <Link href="/admin/articles" className="btn btn-outline-dark btn-sm">Modifica / elimina</Link>
            </form>
            {!ok && <small style={{ color: '#b00020' }}>Per approvare servono copertina e testo inglese: completali in Articoli.</small>}
          </div>
        )
      })}

      <H n={q.social}>Post social</H>
      <SocialList view="draft" back="/admin/approvazioni" take={60} />

      <H n={q.campaigns.length}>Newsletter</H>
      {!q.campaigns.length && <p style={{ color: 'var(--muted)' }}>Nessuna bozza.</p>}
      {q.campaigns.map((c) => (
        <div key={c.id} style={card}>
          <h3 style={{ fontSize: 20, margin: '0 0 8px' }}>{c.subject}</h3>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Invia a tutti gli iscritti confermati…</summary>
            <form style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={c.id} />
              <p style={{ margin: '0 0 8px' }}>L’invio non si può annullare. Controlla prima il testo in <Link href="/admin/newsletter">Campagne</Link>.</p>
              <button className="btn btn-sm" formAction={campaignSendNow}>Sì, invia ora</button>
            </form>
          </details>
        </div>
      ))}

      <H n={q.tasks.length}>Proposte dell’agente</H>
      {!q.tasks.length && <p style={{ color: 'var(--muted)' }}>Nessuna proposta.</p>}
      {q.tasks.map((t) => (
        <div key={t.id} style={card}>
          <h3 style={{ fontSize: 18, margin: '0 0 4px' }}>{t.title}</h3>
          {t.detail && <p style={{ color: 'var(--muted)', margin: '0 0 10px' }}>{t.detail}</p>}
          <form style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="id" value={t.id} />
            <button className="btn btn-sm" formAction={taskDecide.bind(null, true)}>Approva</button>
            <button className="btn btn-outline-dark btn-sm" formAction={taskDecide.bind(null, false)}>Scarta</button>
          </form>
        </div>
      ))}

      {q.seo > 0 && <p style={{ marginTop: 28 }}>📄 {q.seo} pagine SEO in bozza: <Link href="/admin/seo">rivedile qui</Link>.</p>}
    </div>
  )
}
