import Link from 'next/link'
import { cleanText } from '@/lib/clean'
import { FREE_FEATURES, PRO_FEATURES } from '@/lib/plans'
import { db } from '@/lib/db'
import { getSectionTools, pick } from '@/lib/content'
import { AppCard, AppRow, FeatureCard } from '@/components/AppCard'
import { SECTIONS, sectionHref } from '@/lib/sections'
import { PRO_PRICE_LABEL } from '@/lib/access'

export const dynamic = 'force-dynamic'

const ICONS: Record<string, React.ReactNode> = {
  'free-earn': <path d="M12 3v18M3 12h18M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  wallet: <path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01" />,
  exchange: <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />,
  tools: <path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2-.5-.5-2z" />,
  grow: <path d="M4 18l5-5 4 4 7-8M15 9h5v5" />,
  privacy: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3zM9.5 12l2 2 3.5-4" />,
}

export default async function Home() {
  const [posts, sectionTools] = await Promise.all([
    db.post.findMany({
      where: { status: 'PUBLISHED', access: 'FREE' },
      orderBy: { publishedAt: 'desc' },
      take: 40,
      include: { translations: true, category: { include: { translations: true } } },
    }),
    Promise.all(SECTIONS.map((s) => (s.pro ? Promise.resolve([]) : getSectionTools(s.collections, s.key === 'wallet' ? 9 : 12)))),
  ])
  const bySection = Object.fromEntries(SECTIONS.map((s, i) => [s.key, sectionTools[i]]))
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? '#'

  const freePosts = posts.filter((p) => p.access === 'FREE').slice(0, 4)
  const PostLink = ({ p, locked = false }: { p: (typeof posts)[number]; locked?: boolean }) => (
    <Link href={`/post/${p.slug}`} className={`post-row${p.coverUrl ? ' has-thumb' : ''}`}>
      {p.coverUrl && <img src={p.coverUrl} alt="" className="post-thumb" loading="lazy" />}
      <span className="t">
        {locked && <span className="lock" aria-hidden="true">&#128274;</span>}
        {cleanText(pick(p.translations)?.title)}
      </span>
      <span className="m">{p.publishedAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    </Link>
  )

  const all = sectionTools.flat()
  const floaters = all.filter((t) => t.logoUrl).slice(0, 7)
  // in evidenza: tool con copertina, uno per sezione gratuita
  const picks = SECTIONS.filter((s) => !s.pro)
    .map((s) => bySection[s.key].find((t) => t.coverUrl))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .slice(0, 3)
  const tones = ['blue', 'yellow', 'ink'] as const

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container">
          <div>
            <h1>Discover the best crypto tools, airdrops and privacy stack</h1>
            <p>
              Wallets, exchanges, airdrops, DeFi, privacy, security and analysis. Every tool comes with a plain guide
              to what it is, how it works and when to use it.
            </p>
            <div className="hero-actions">
              <Link href="#plans" className="btn btn-yellow">
                Get started free
              </Link>
              <Link href="#start" className="btn btn-outline">
                Browse the store
              </Link>
            </div>
            <div className="hero-chips">
              {SECTIONS.filter((s) => !s.pro).map((s) => (
                <Link key={s.key} href={sectionHref(s.key)}>
                  {s.title}
                </Link>
              ))}
            </div>
          </div>
          <div className="stack" aria-hidden="true">
            {floaters.map((t, i) => (
              <div key={t.id} className={`stack-card stack-${i}`}>
                <img src={t.logoUrl!} alt="" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="block start" id="start">
        <div className="container">
          <h2>Start here</h2>
          <p className="lead">Choose what you want to do. Each section opens the tools for it, with a plain explanation of every one.</p>
          <div className="start-grid">
            {SECTIONS.filter((s) => !s.pro).map((s) => (
              <Link key={s.key} href={sectionHref(s.key)} className={`start-card ${s.pro ? 'is-pro' : ''}`}>
                <span className="start-icon">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {ICONS[s.key]}
                  </svg>
                </span>
                <span className="start-title">
                  {s.title}
                  {s.pro && <span className="badge-pro">PRO</span>}
                </span>
                <span className="start-text">{s.description}</span>
                <span className="start-go">Go</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="block" id="wallets">
        <div className="container">
          <div className="row-head">
            <div>
              <h2>Wallets</h2>
              <p className="lead" style={{ marginBottom: 0 }}>{SECTIONS[1].description}</p>
            </div>
            <Link href={sectionHref('wallet')}>See all</Link>
          </div>
          <div className="chart">
            {bySection['wallet'].map((t, i) => (
              <AppRow key={t.id} tool={t} rank={i + 1} />
            ))}
          </div>
        </div>
      </section>

      {SECTIONS.filter((s) => !s.pro && !['wallet', 'exchange', 'tools'].includes(s.key)).map((s) => {
        const list = bySection[s.key]
        if (!list.length) return null
        return (
          <section key={s.key} className="block rail-block">
            <div className="container">
              <div className="row-head">
                <div>
                  <h2>
                    {s.title}
                    {s.pro && <span className="badge-pro">PRO</span>}
                  </h2>
                  <p className="lead" style={{ marginBottom: 0 }}>{s.description}</p>
                </div>
                <Link href={sectionHref(s.key)}>See all</Link>
              </div>
            </div>
            <div className="rail rail-small" role="list">
              {list.map((t) => (
                <AppCard key={t.id} tool={t} pro={s.pro} />
              ))}
            </div>
          </section>
        )
      })}

      {picks.length > 0 && (
        <section className="block store-top">
          <div className="container">
            <div className="row-head">
              <h2 style={{ fontSize: 30 }}>Editor&apos;s picks</h2>
            </div>
            <div className="features">
              {picks.map((t, i) => (
                <FeatureCard key={t.id} tool={t} tone={tones[i]} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="block" id="plans">
        <div className="container">
          <h2>Free to start, PRO when you want more</h2>
          <p className="lead">One paid plan, billed monthly. Cancel whenever you like.</p>
          <div className="plans">
            <div className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-price">
                <b>€0</b>
                <span>no card needed</span>
              </div>
              <ul className="plan-list">
                {FREE_FEATURES.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-blue">
                Get started free
              </Link>
            </div>
            <div className="plan plan-pro">
              <div className="plan-name">
                PRO <span className="badge-pro pro-on-dark">All access</span>
              </div>
              <div className="plan-price">
                <b>€14</b>
                <span>per month</span>
              </div>
              <ul className="plan-list">
                {PRO_FEATURES.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href="/signup?plan=pro" className="btn btn-yellow" aria-label={`Get PRO, ${PRO_PRICE_LABEL}`}>
                Get PRO
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="container">
          <div className="row-head">
            <h2 style={{ fontSize: 34 }}>Blog</h2>
            <Link href="/blog">All articles</Link>
          </div>
          <div className="posts posts-home">
            {freePosts.map((p) => (
              <PostLink key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container">
          <div>
            <h2>Get new tools and airdrops first on Telegram</h2>
            <p>Join the channel and see each new listing the day it goes live.</p>
          </div>
          <a href={telegram} className="btn btn-black">
            Join on Telegram
          </a>
        </div>
      </section>
    </>
  )
}
