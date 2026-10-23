import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { publerBusyDays } from '@/lib/publer'
import { romeToDate } from '@/lib/time'

export const dynamic = 'force-dynamic'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const fmtDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' })
const fmtTime = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' })
const CH: Record<string, string> = { x: 'X', telegram: 'Telegram', facebook: 'Facebook' }

export default async function Page() {
  await requireAdmin()
  const today = fmtDay.format(new Date())
  const end = new Date(romeToDate(`${today}T00:00`).getTime() + 31 * 86400000)
  const from = romeToDate(`${today}T00:00`)

  const [articles, social, publer] = await Promise.all([
    db.post.findMany({ where: { status: 'DRAFT', scheduledAt: { gte: from, lt: end } }, include: { translations: true, category: true }, orderBy: { scheduledAt: 'asc' } }),
    db.socialPost.findMany({ where: { scheduledAt: { gte: from, lt: end }, status: { not: 'REJECTED' } }, orderBy: { scheduledAt: 'asc' } }),
    publerBusyDays(today, fmtDay.format(end)),
  ])

  type Item = { kind: 'article' | 'analysis' | 'social'; time: string; title: string; detail: string }
  const byDay = new Map<string, Item[]>()
  const add = (d: Date | null, it: Item) => { if (!d) return; const k = fmtDay.format(d); byDay.set(k, [...(byDay.get(k) ?? []), it]) }

  for (const p of articles) {
    const t = p.translations.find((x) => x.locale === 'EN') ?? p.translations[0]
    const analysis = p.category?.slug === 'weekly-crypto-analysis' || (p.access === 'PRO' && !p.categoryId)
    add(p.scheduledAt, { kind: analysis ? 'analysis' : 'article', time: p.scheduledAt ? fmtTime.format(p.scheduledAt) : '', title: t?.title ?? p.slug, detail: analysis ? 'Analisi PRO · solo abbonati · nessun social' : 'Articolo del blog' })
  }
  // i post X / Telegram / Facebook dello stesso contenuto (stesso batch) sono mostrati come una riga
  const groups = new Map<string, typeof social>()
  for (const s of social) groups.set(s.batch ?? s.id, [...(groups.get(s.batch ?? s.id) ?? []), s])
  for (const g of groups.values()) {
    const s = g[0]
    const first = s.text.split('\n').find((l) => l.trim()) ?? ''
    const state = g.some((x) => x.publerRef?.startsWith('ERROR')) ? 'ERRORE su Publer' : g.every((x) => x.publerRef?.startsWith('draft')) ? 'bozza su Publer (non esce da sola)' : g.some((x) => x.status === 'SENT') ? 'inviato' : 'programmato'
    add(s.scheduledAt, { kind: 'social', time: s.scheduledAt ? fmtTime.format(s.scheduledAt) : '', title: first.slice(0, 90), detail: `${g.map((x) => CH[x.channel] ?? x.channel).join(' + ')} · ${state}` })
  }

  const days: string[] = []
  for (let i = 0; i < 31; i++) days.push(fmtDay.format(new Date(romeToDate(`${today}T00:00`).getTime() + i * 86400000 + 12 * 3600000)))
  const color = { article: '#b7791f', analysis: '#6b3fd4', social: '#3C53F4' } as const
  const label = { article: 'ARTICOLO', analysis: 'ANALISI PRO', social: 'SOCIAL' } as const

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Pubblicazioni programmate</h1>
      <AdminNav />
      <p style={{ color: '#555' }}>Prossimi 30 giorni. Mostra articoli e analisi programmati sul sito e i post social registrati dal sito.
        {publer === null ? ' Publer non ha risposto: i post caricati a mano su Publer potrebbero non comparire.' : ' I giorni con post su Publer ma non nel sito sono segnalati.'}</p>
      <table className="admin-table">
        <thead><tr><th style={{ width: 110 }}>Giorno</th><th>Contenuti</th></tr></thead>
        <tbody>
          {days.map((d) => {
            const items = byDay.get(d) ?? []
            const wd = DAYS[new Date(`${d}T12:00:00Z`).getUTCDay()]
            const socialCount = items.filter((i) => i.kind === 'social').length
            const onPublerOnly = !socialCount && publer?.has(d)
            const warn = socialCount > 1 ? 'Più di un contenuto social' : !socialCount && !onPublerOnly ? 'Nessun post social' : ''
            return (
              <tr key={d} style={d === today ? { background: '#fffbe0' } : undefined}>
                <td><b>{wd} {d.slice(8)}/{d.slice(5, 7)}</b></td>
                <td>
                  {items.map((it, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      <span style={{ color: color[it.kind], fontWeight: 800, fontSize: 12 }}>{label[it.kind]}</span> {it.time} · {it.title}
                      <div style={{ color: '#666', fontSize: 12 }}>{it.detail}</div>
                    </div>
                  ))}
                  {onPublerOnly && <div style={{ color: '#666', fontSize: 12 }}>Post presenti su Publer (non registrati dal sito)</div>}
                  {warn && <div style={{ color: '#c0392b', fontWeight: 700, fontSize: 12 }}>⚠ {warn}</div>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
