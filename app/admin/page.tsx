import Link from 'next/link'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

const day = (n: number) => new Date(Date.now() - n * 86400000)

export default async function AdminHome() {
  await requireAdmin()
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
