import Link from 'next/link'
import { db } from '@/lib/db'
import { getSectionTools, pick } from '@/lib/content'
import { AppCard, AppRow, FeatureCard } from '@/components/AppCard'
import { SECTIONS, sectionHref } from '@/lib/sections'
import { PRO_PRICE_LABEL } from '@/lib/access'

export const dynamic = 'force-dynamic'

const FREE_FEATURES = [
  'Free earn, Wallet, Exchange and Tools sections',
  'Key facts for every tool, side by side',
  'Guides on what each tool is, how it works and when to use it',
  'Blog and newsletter',
]
const PRO_FEATURES = [
  'Everything in Free',
  'Grow, Privacy and Analysis sections',
  'Video tutorials for each tool',
  'Cancel any time',
]

export default async function Home() {
  const [posts, sectionTools] = await Promise.all([
    db.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      include: { translations: true, category: { include: { translations: true } } },
    }),
    Promise.all(SECTIONS.map((s) => getSectionTools(s.collections, s.key === 'wallet' ? 9 : 12))),
  ])
  const bySection = Object.fromEntries(SECTIONS.map((s, i) => [s.key, sectionTools[i]]))
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? '#'

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
              <Link href="#wallets" className="btn btn-outline">
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

      {picks.length > 0 && (
        <section className="block store-top">
          <div className="container">
            <div className="row-head">
              <h2>Editor&apos;s picks</h2>
            </div>
            <div className="features">
              {picks.map((t, i) => (
                <FeatureCard key={t.id} tool={t} tone={tones[i]} />
              ))}
            </div>
          </div>
        </section>
      )}

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

      {SECTIONS.filter((s) => s.key !== 'wallet').map((s) => {
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
            <div className="rail" role="list">
              {list.map((t) => (
                <AppCard key={t.id} tool={t} pro={s.pro} />
              ))}
            </div>
          </section>
        )
      })}

      <section className="block" id="plans">
        <div className="container">
          <h2>Start free, upgrade for the PRO sections</h2>
          <p className="lead">One paid plan, billed monthly. Cancel whenever you like.</p>
          <div className="plans">
            <div className="plan">
              <h3>Free</h3>
              <div className="price">€0, no card needed</div>
              <ul>
                {FREE_FEATURES.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href="/signup" className="btn btn-blue">
                Get started free
              </Link>
            </div>
            <div className="plan plan-pro">
              <h3>PRO</h3>
              <div className="price">
                <b>€14</b> per month
              </div>
              <ul>
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

      {posts.length > 0 && (
        <section className="block">
          <div className="container">
            <div className="row-head">
              <h2>Latest guides</h2>
              <Link href="/blog">All articles</Link>
            </div>
            <div className="posts">
              {posts.map((p) => {
                const t = pick(p.translations)
                const cat = p.category ? pick(p.category.translations)?.name : null
                return (
                  <Link key={p.id} href={`/post/${p.slug}`} className="post-row">
                    <span className="t">{t?.title}</span>
                    <span className="m">
                      {[cat, p.publishedAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

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
