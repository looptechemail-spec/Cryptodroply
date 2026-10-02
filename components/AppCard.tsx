import Link from 'next/link'
import type { AppTool } from '@/lib/content'
import { cleanText } from '@/lib/clean'

type Lang = 'en' | 'it'
// componenti usabili anche da client component: niente lib/i18n, il prefisso /it si costruisce qui
const lh = (path: string, lang?: Lang) => (lang === 'it' ? '/it' + path : path)

export function AppIcon({ tool, size = 72 }: { tool: Pick<AppTool, 'title' | 'logoUrl'>; size?: number }) {
  return (
    <div className="app-icon" style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}>
      {tool.logoUrl ? <img src={tool.logoUrl} alt="" loading="lazy" /> : <span>{tool.title.slice(0, 1)}</span>}
    </div>
  )
}

/** Scheda verticale, per le file scorrevoli e le griglie. */
export function AppCard({ tool, pro = false, base, lang }: { tool: AppTool; pro?: boolean; base?: string; lang?: Lang }) {
  return (
    <Link href={lh(`${base ?? '/' + tool.categorySlug}/${tool.slug}`, lang)} className="app-card">
      <AppIcon tool={tool} />
      <div className="app-card-body">
        <div className="app-name">{tool.title}</div>
        {!!tool.tags?.length && (
          <div className="app-tags">
            {tool.tags.slice(0, 4).map((g) => (
              <span key={g.label} className="app-tag">
                <span aria-hidden="true">{g.emoji}</span> {g.label}
              </span>
            ))}
          </div>
        )}
        <div className="app-desc">{cleanText(tool.description)}</div>
      </div>
      <div className="app-card-foot">
        <span className="app-chip">{tool.categoryName}</span>
        <span className={`app-get ${pro ? 'is-pro' : ''}`}>{pro ? 'PRO' : lang === 'it' ? 'Vedi' : 'View'}</span>
      </div>
    </Link>
  )
}

/** Riga compatta, per le classifiche a colonne. */
export function AppRow({ tool, rank, pro = false, lang }: { tool: AppTool; rank?: number; pro?: boolean; lang?: Lang }) {
  return (
    <Link href={lh(`/${tool.categorySlug}/${tool.slug}`, lang)} className="app-row">
      {rank !== undefined && <span className="app-rank">{rank}</span>}
      <AppIcon tool={tool} size={60} />
      <div className="app-row-body">
        <div className="app-name">{tool.title}</div>
        <div className="app-desc">{cleanText(tool.description)}</div>
      </div>
      <span className={`app-get ${pro ? 'is-pro' : ''}`}>{pro ? 'PRO' : lang === 'it' ? 'Vedi' : 'View'}</span>
    </Link>
  )
}

/** Grande scheda in evidenza, con la copertina del tool. */
export function FeatureCard({ tool, tone, lang }: { tool: AppTool; tone: 'blue' | 'yellow' | 'ink'; lang?: Lang }) {
  return (
    <Link href={lh(`/${tool.categorySlug}/${tool.slug}`, lang)} className={`feature feature-${tone}`}>
      <div className="feature-copy">
        <span className="feature-kicker">{tool.categoryName}</span>
        <h3>{tool.title}</h3>
        <p>{cleanText(tool.description)}</p>
        <span className="feature-cta">
          <AppIcon tool={tool} size={44} />
          <span className="app-get">{lang === 'it' ? 'Vedi' : 'View'}</span>
        </span>
      </div>
      {tool.coverUrl && <img className="feature-cover" src={tool.coverUrl} alt="" loading="lazy" />}
    </Link>
  )
}
