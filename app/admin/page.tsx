import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { approveTask, rejectTask } from '@/lib/agent'
import { dateToRome } from '@/lib/time'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

const day = (n: number) => new Date(Date.now() - n * 86400000)
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

async function approve(fd: FormData) {
  'use server'
  await requireAdmin()
  const r = await approveTask(String(fd.get('id') ?? ''))
  revalidatePath('/admin')
  redirect('/admin?r=' + encodeURIComponent((r.ok ? 'Fatto: ' : 'ERRORE: ') + r.text.slice(0, 300)))
}
async function reject(fd: FormData) {
  'use server'
  await requireAdmin()
  const r = await rejectTask(String(fd.get('id') ?? ''))
  revalidatePath('/admin')
  redirect('/admin?r=' + encodeURIComponent(r.ok ? 'Proposta scartata.' : r.text))
}

const Card = ({ id, icon, title, count, href, cta, children }: { id: string; icon: string; title: string; count: number; href?: string; cta?: string; children?: React.ReactNode }) => (
  <section id={id} style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-1)', scrollMarginTop: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: count ? 12 : 0 }}>
      <h2 style={{ fontSize: 20, margin: 0 }}>{icon} {title} <span style={{ background: count ? '#3C53F4' : '#e6f6ea', color: count ? '#fff' : '#145a2a', borderRadius: 999, padding: '2px 10px', fontSize: 14, marginLeft: 6 }}>{count}</span></h2>
      {href && count > 0 && <Link href={href} className="btn btn-blue btn-sm">{cta ?? 'Apri'} →</Link>}
    </div>
    {children}
  </section>
)
const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid #eee' }}>{children}</div>
)

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await requireAdmin()
  const { r } = await searchParams
  const [tools, posts, proPosts, users, pro, subs, confirmed, clicks7, clicks30, views7, recent] = await Promise.all([
    db.tool.count({ where: { status: 'PUBLISHED' } }),
    db.post.count({ where: { status: 'PUBLISHED' } }),
    db.post.count({ where: { status: 'PUBLISHED', access: 'PRO' } }),
    db.user.count(),
    db.subscription.count({ where: { status: { in: ['ACTIVE', 'TRIALING'] } } }),
    db.subscriber.count({ where: { unsubscribedAt: null } }),
    db.subscriber.count({ where: { unsubscribedAt: null, confirmedAt: { not: null } } }),
    db.event.count({ where: { kind: 'AFFILIATE_CLICK', createdAt: { gte: day(7) } } }),
    db.event.count({ where: { kind: 'AFFILIATE_CLICK', createdAt: { gte: day(30) } } }),
    db.event.count({ where: { kind: 'PAGE_VIEW', createdAt: { gte: day(7) } } }),
    db.subscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
  ])
  const soon = new Date(Date.now() + 48 * 3600000)
  const [proposed, msgCount, msgs, draftCount, draftTodo, drafts, newsDrafts, toolDrafts, queued, failed, upcoming] = await Promise.all([
    db.agentTask.findMany({ where: { status: 'PROPOSED' }, orderBy: { createdAt: 'asc' }, take: 10 }),
    db.formSubmission.count({ where: { handled: false } }),
    db.formSubmission.findMany({ where: { handled: false }, orderBy: { createdAt: 'desc' }, take: 6 }),
    db.post.count({ where: { status: 'DRAFT' } }),
    db.post.count({ where: { status: 'DRAFT', scheduledAt: null } }),
    db.post.findMany({ where: { status: 'DRAFT' }, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 8, include: { translations: true, category: true } }),
    db.socialPost.count({ where: { source: 'news', status: 'DRAFT' } }),
    db.socialPost.count({ where: { source: 'tool', status: 'DRAFT' } }),
    db.agentTask.findMany({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' }, take: 5 }),
    db.agentTask.findMany({ where: { status: 'FAILED', updatedAt: { gte: day(2) } }, orderBy: { updatedAt: 'desc' }, take: 5 }),
    db.post.findMany({ where: { status: 'DRAFT', scheduledAt: { gte: new Date(), lte: soon } }, orderBy: { scheduledAt: 'asc' }, take: 5, include: { translations: true } }),
  ])
  const socialDrafts = newsDrafts + toolDrafts
  const todo = proposed.length + msgCount + draftTodo + socialDrafts + failed.length
  const title = (t: { locale: string; title: string | null }[]) => t.find((x) => x.locale === 'EN')?.title ?? t[0]?.title ?? '(senza titolo)'
  const top = await db.event.groupBy({
    by: ['toolId'],
    where: { kind: 'AFFILIATE_CLICK', createdAt: { gte: day(30) }, toolId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { toolId: 'desc' } },
    take: 10,
  })
  const names = await db.tool.findMany({
    where: { id: { in: top.map((t) => t.toolId!).filter(Boolean) } },
    select: { id: true, title: true, category: { select: { slug: true } }, slug: true },
  })
  const byId = new Map(names.map((n) => [n.id, n]))
  const mrr = pro * 14

  const Stat = ({ label, value, note }: { label: string; value: string | number; note?: string }) => (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
      {note && <small>{note}</small>}
    </div>
  )

  return (
    <div className="container">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 44 }}>Admin</h1>
      </div>
      <AdminNav />

      {r && <p role="status" style={{ padding: '12px 16px', borderRadius: 12, fontWeight: 700, background: r.startsWith('ERR') ? '#fde8e8' : '#e6f6ea', color: r.startsWith('ERR') ? '#a11' : '#145a2a' }}>{r}</p>}

      <div style={{ margin: '8px 0 12px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 28, margin: 0 }}>{todo ? `Da fare ora: ${todo}` : '✅ Niente da decidere ora'}</h2>
        <small style={{ color: 'var(--muted)' }}>aggiornato alle {dateToRome(new Date()).slice(11)}</small>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {([['#approvazioni', '⏳ Approvazioni', proposed.length], ['#messaggi', '📨 Messaggi', msgCount], ['#articoli', '📝 Articoli da gestire', draftTodo], ['#social', '📣 Post social', socialDrafts], ['#problemi', '⚠️ Non riuscite', failed.length], ['#claude', '🧰 Per Claude', queued.length]] as const).map(([h, l, n]) => (
          <a key={h} href={h} className="btn btn-sm" style={{ opacity: n ? 1 : 0.5 }}>{l} <b>{n}</b></a>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', marginBottom: 32 }}>
        <Card id="approvazioni" icon="⏳" title="Da approvare" count={proposed.length} href="/admin/agente" cta="Registro completo">
          {proposed.map((t) => (
            <Row key={t.id}>
              <div style={{ flex: '1 1 240px' }}>
                <b>{t.title}</b>
                {t.detail && <div style={{ whiteSpace: 'pre-wrap', color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{short(t.detail, 320)}</div>}
                <small style={{ color: 'var(--muted)' }}>{dateToRome(t.createdAt).replace('T', ' ')} · {t.source}</small>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <form action={approve}><input type="hidden" name="id" value={t.id} /><button className="btn btn-blue btn-sm">✅ Approva</button></form>
                <form action={reject}><input type="hidden" name="id" value={t.id} /><button className="btn btn-sm">❌ Scarta</button></form>
              </div>
            </Row>
          ))}
        </Card>

        <Card id="messaggi" icon="📨" title="Messaggi da gestire" count={msgCount} href="/admin/messages" cta="Rispondi">
          {msgs.map((m) => {
            const p = m.payload as Record<string, unknown>
            return (
              <Row key={m.id}>
                <div style={{ flex: '1 1 240px' }}>
                  <b>{m.email ?? 'senza email'}</b> <small style={{ color: 'var(--muted)' }}>{m.type} · {dateToRome(m.createdAt).replace('T', ' ')}</small>
                  <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{short(String(p.message ?? JSON.stringify(p)), 200)}</div>
                </div>
                <Link href={`/admin/messages#m-${m.id}`} className="btn btn-blue btn-sm">Rispondi →</Link>
              </Row>
            )
          })}
          {msgCount > msgs.length && <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>e altri {msgCount - msgs.length}…</p>}
        </Card>

        <Card id="articoli" icon="📝" title="Articoli in bozza (non ancora programmati o pubblicati)" count={draftCount} href="/admin/articles" cta="Apri gli articoli">
          {drafts.map((p) => {
            const analysis = p.category?.slug === 'weekly-crypto-analysis' || (p.access === 'PRO' && !p.categoryId)
            return (
              <Row key={p.id}>
                <div style={{ flex: '1 1 240px' }}>
                  <b>{short(title(p.translations), 80)}</b>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                    {analysis ? '📊 Analisi PRO' : 'Articolo'} · {p.coverUrl ? 'copertina ✅' : <span style={{ color: '#b00020' }}>copertina mancante</span>} · {p.scheduledAt ? `📅 ${dateToRome(p.scheduledAt).replace('T', ' ')}` : 'non programmato'}
                  </div>
                </div>
                <Link href={`/admin/articles#p-${p.id}`} className="btn btn-sm">Lavora →</Link>
              </Row>
            )
          })}
        </Card>

        <Card id="social" icon="📣" title="Post social da rivedere" count={socialDrafts}>
          {newsDrafts > 0 && <Row><span><b>{newsDrafts}</b> post di news</span><Link href="/admin/news" className="btn btn-blue btn-sm">Rivedi →</Link></Row>}
          {toolDrafts > 0 && <Row><span><b>{toolDrafts}</b> post sugli strumenti (programma della settimana)</span><Link href="/admin/tool-posts" className="btn btn-blue btn-sm">Rivedi →</Link></Row>}
        </Card>

        <Card id="problemi" icon="⚠️" title="Azioni non riuscite (ultimi 2 giorni)" count={failed.length} href="/admin/agente" cta="Registro">
          {failed.map((t) => <Row key={t.id}><div><b>{short(t.title, 100)}</b><div style={{ color: '#b00020', fontSize: 14 }}>{short(t.result ?? '', 200)}</div></div></Row>)}
        </Card>

        <Card id="claude" icon="🧰" title="Richieste in coda per Claude" count={queued.length} href="/admin/agente" cta="Registro">
          {queued.map((t) => <Row key={t.id}><div>{short(t.detail || t.title, 220)}<div><small style={{ color: 'var(--muted)' }}>{dateToRome(t.createdAt).replace('T', ' ')}</small></div></div></Row>)}
        </Card>

        {upcoming.length > 0 && (
          <Card id="uscite" icon="📅" title="In uscita nelle prossime 48 ore" count={upcoming.length} href="/admin/articles" cta="Articoli">
            {upcoming.map((p) => <Row key={p.id}><span>{short(title(p.translations), 70)}</span><small>{p.scheduledAt ? dateToRome(p.scheduledAt).replace('T', ' ') : ''}</small></Row>)}
          </Card>
        )}
      </div>

      <div className="stats">
        <Stat label="Click affiliati, 7 giorni" value={clicks7} note={`${clicks30} in 30 giorni`} />
        <Stat label="Visualizzazioni di pagina, 7 giorni" value={views7} />
        <Stat label="Abbonati PRO" value={pro} note={`circa €${mrr} al mese`} />
        <Stat label="Newsletter" value={subs} note={`${confirmed} confermati`} />
        <Stat label="Strumenti pubblicati" value={tools} />
        <Stat label="Articoli" value={posts} note={`${proPosts} analisi PRO`} />
        <Stat label="Account" value={users} />
      </div>

      <div className="two-col" style={{ margin: '40px 0 72px' }}>
        <div>
          <h2 style={{ fontSize: 26, marginBottom: 12 }}>Strumenti più cliccati, 30 giorni</h2>
          <div className="posts">
            {top.length === 0 && <p style={{ color: 'var(--muted)' }}>Ancora nessun click affiliato.</p>}
            {top.map((t) => {
              const n = byId.get(t.toolId!)
              return (
                <Link key={t.toolId} href={n ? `/${n.category.slug}/${n.slug}` : '#'} className="post-row">
                  <span className="t" style={{ fontSize: 19 }}>{n?.title ?? 'Strumento eliminato'}</span>
                  <span className="m"><b>{t._count._all}</b> click</span>
                </Link>
              )
            })}
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: 26, marginBottom: 12 }}>Ultime iscrizioni alla newsletter</h2>
          <div className="posts">
            {recent.length === 0 && <p style={{ color: 'var(--muted)' }}>Ancora nessuna iscrizione.</p>}
            {recent.map((s) => (
              <div key={s.id} className="post-row">
                <span className="t" style={{ fontSize: 17 }}>{s.email}</span>
                <span className="m">{s.confirmedAt ? 'confermato' : 'in attesa'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
