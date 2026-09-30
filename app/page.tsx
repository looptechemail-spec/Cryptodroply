import Link from 'next/link'
import { db } from '@/lib/db'
import { getCategories, pick } from '@/lib/content'
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
  const [categories, posts] = await Promise.all([
    getCategories(),
    db.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      include: { translations: true, category: { include: { translations: true } } },
    }),
  ])

  const index = [...categories].sort((a, b) => b.count - a.count).slice(0, 8)
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL ?? '#'

  return (
    <>
      <section className="hero">
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
              <Link href="#sections" className="btn btn-outline">
                Explore sections
              </Link>
            </div>
          </div>
          <div>
            <div className="index-title">Inside the directory</div>
            <div className="index-list">
              {index.map((c) => (
                <Link key={c.id} href={`/${c.slug}`} className="index-row">
                  <span>{c.name}</span>
                  <b>{c.count}</b>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="sections">
        <div className="container">
          <h2>Start with what you want to do</h2>
          <p className="lead">
            Sections cover the whole crypto toolkit, from earning your first coins to keeping your activity private.
          </p>
          <div className="tiles">
            {SECTIONS.map((s, i) => (
              <Link
                key={s.key}
                href={sectionHref(s.key)}
                className={`tile ${i === 0 ? 'tile-yellow' : i === 1 ? 'tile-blue' : ''}`}
              >
                <div>
                  <h3>
                    {s.title}
                    {s.pro && <span className="badge-pro">PRO</span>}
                  </h3>
                  <p>{s.description}</p>
                </div>
                <span className="more">Browse {s.title.toLowerCase()}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
