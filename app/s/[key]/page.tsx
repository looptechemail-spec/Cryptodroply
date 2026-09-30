import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategories, getSectionTools } from '@/lib/content'
import { AppCard } from '@/components/AppCard'
import { SECTIONS } from '@/lib/sections'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const s = SECTIONS.find((x) => x.key === key)
  return s ? { title: s.title, description: s.description } : {}
}

export default async function SectionPage({ params }: Props) {
  const { key } = await params
  const section = SECTIONS.find((s) => s.key === key)
  if (!section) notFound()

  const cats = (await getCategories()).filter((c) => c.wixId && section.collections.includes(c.wixId))
  const tools = await getSectionTools(section.collections, 200)
  const groups = cats.map((c) => ({ c, list: tools.filter((t) => t.categorySlug === c.slug) })).filter((g) => g.list.length)

  return (
    <div className="container">
      <div className="page-head">
        <h1>
          {section.title}
          {section.pro && (
            <>
              {' '}
              <span className="badge-pro" style={{ verticalAlign: 'middle' }}>PRO</span>
            </>
          )}
        </h1>
        <p style={{ fontSize: 20, maxWidth: 640 }}>{section.description}</p>
        <div className="hero-chips dark">
          {cats.map((c) => (
            <Link key={c.id} href={`/${c.slug}`}>
              {c.name} ({c.count})
            </Link>
          ))}
        </div>
      </div>
      {groups.map(({ c, list }) => (
        <section key={c.id} className="group">
          <div className="row-head">
            <h2 style={{ fontSize: 28 }}>{c.name}</h2>
            <Link href={`/${c.slug}`}>See all</Link>
          </div>
          <div className="app-grid">
            {list.map((t) => (
              <AppCard key={t.id} tool={t} pro={section.pro} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
