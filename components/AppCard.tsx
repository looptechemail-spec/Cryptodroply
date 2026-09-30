import Link from 'next/link'
import type { AppTool } from '@/lib/content'

export function AppIcon({ tool, size = 72 }: { tool: Pick<AppTool, 'title' | 'logoUrl'>; size?: number }) {
  return (
    <div className="app-icon" style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}>
      {tool.logoUrl ? <img src={tool.logoUrl} alt="" loading="lazy" /> : <span>{tool.title.slice(0, 1)}</span>}
    </div>
  )
}

/** Scheda verticale, per le file scorrevoli e le griglie. */
export function AppCard({ tool, pro = false, base }: { tool: AppTool; pro?: boolean; base?: string }) {
  return (
    <Link href={`${base ?? '/' + tool.categorySlug}/${tool.slug}`} className="app-card">
      <AppIcon tool={tool} />
      <div className="app-card-body">
        <div className="app-name">{tool.title}</div>
        <div className="app-desc">{tool.description}</div>
      </div>
      <div className="app-card-foot">
        <span className="app-chip">{tool.categoryName}</span>
        <span className={`app-get ${pro ? 'is-pro' : ''}`}>{pro ? 'PRO' : 'View'}</span>
      </div>
    </Link>
  )
}

/** Riga compatta, per le classifiche a colonne. */
export function AppRow({ tool, rank, pro = false }: { tool: AppTool; rank?: number; pro?: boolean }) {
  return (
    <Link href={`/${tool.categorySlug}/${tool.slug}`} className="app-row">
      {rank !== undefined && <span className="app-rank">{rank}</span>}
      <AppIcon tool={tool} size={60} />
      <div className="app-row-body">
        <div className="app-name">{tool.title}</div>
        <div className="app-desc">{tool.description}</div>
      </div>
      <span className={`app-get ${pro ? 'is-pro' : ''}`}>{pro ? 'PRO' : 'View'}</span>
    </Link>
  )
}

/** Grande scheda in evidenza, con la copertina del tool. */
export function FeatureCard({ tool, tone }: { tool: AppTool; tone: 'blue' | 'yellow' | 'ink' }) {
  return (
    <Link href={`/${tool.categorySlug}/${tool.slug}`} className={`feature feature-${tone}`}>
      <div className="feature-copy">
        <span className="feature-kicker">{tool.categoryName}</span>
        <h3>{tool.title}</h3>
        <p>{tool.description}</p>
        <span className="feature-cta">
          <AppIcon tool={tool} size={44} />
          <span className="app-get">View</span>
        </span>
      </div>
      {tool.coverUrl && <img className="feature-cover" src={tool.coverUrl} alt="" loading="lazy" />}
    </Link>
  )
}
