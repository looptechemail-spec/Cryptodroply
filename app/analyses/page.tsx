import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'
import { cleanText } from '@/lib/clean'
import { hasPro, PRO_PRICE_LABEL, PRO_PRICE_LABEL_IT } from '@/lib/access'
import BlogTabs from '@/components/BlogTabs'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Analyses', 'Analisi'),
    description: t('In-depth crypto analysis for PRO members.', 'Analisi crypto approfondite per chi ha PRO.'),
    robots: { index: false, follow: false },
  }
}

export default async function Analyses() {
  const { t: tr, it, loc } = await i18n()
  const fmt = (d: Date | null) => d?.toLocaleDateString(it ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const member = await hasPro()
  // Chi non è PRO non riceve nemmeno i titoli: si leggono solo se si è abbonati.
  const posts = member
    ? await db.post.findMany({
      where: { status: 'PUBLISHED', access: 'PRO' },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      include: { translations: true, category: { include: { translations: true } } },
    })
    : []
  const total = member ? posts.length : await db.post.count({ where: { status: 'PUBLISHED', access: 'PRO' } })
  return (
    <div className="container">
      <div className="page-head">
        <h1>
          {tr('Analyses', 'Analisi')} <span className="badge-pro" style={{ verticalAlign: 'middle' }}>PRO</span>
        </h1>
        <p style={{ fontSize: 20, maxWidth: 680 }}>
          {tr('Weekly and in-depth analysis built on price structure, on-chain data, fundamentals and risk.', 'Analisi settimanali e approfondite basate su struttura dei prezzi, dati on-chain, fondamentali e rischio.')}
        </p>
      </div>
      <BlogTabs active="analyses" />
      {!member ? (
        <div className="paywall" style={{ marginTop: 28 }}>
          <span className="paywall-lock" aria-hidden="true">&#128274;</span>
          <h2>{tr('Analyses are for PRO members', 'Le analisi sono riservate a chi ha PRO')}</h2>
          <p>
            {tr(`${total} in-depth analyses on price structure, on-chain data, fundamentals and risk. Get PRO for ${PRO_PRICE_LABEL} to read them all.`, `${total} analisi approfondite su struttura dei prezzi, dati on-chain, fondamentali e rischio. Passa a PRO a ${PRO_PRICE_LABEL_IT} per leggerle tutte.`)}
          </p>
          <Link href="/signup?plan=pro" className="btn btn-yellow">
            {tr('Get PRO', 'Passa a PRO')}
          </Link>
          <Link href="/login" className="paywall-login">
            {tr('Already a member? Log in', 'Sei già iscritto? Accedi')}
          </Link>
        </div>
      ) : (
        <div className="post-grid">
          {posts.map((p) => {
            const t = pick(p.translations, loc)
            const cat = p.category ? pick(p.category.translations, loc)?.name : null
            return (
              <Link key={p.id} href={`/post/${p.slug}`} className="post-card">
                {p.coverUrl ? <img src={p.coverUrl} alt="" className="post-card-img" loading="lazy" /> : <span className="post-card-img post-card-ph" aria-hidden="true"><img src="/logo.png" alt="" width={44} height={52} /></span>}
                <span className="post-card-body">
                  <span className="post-card-meta">{[cat, fmt(p.publishedAt)].filter(Boolean).join(' · ')}</span>
                  <span className="post-card-title">{cleanText(t?.title)}</span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
