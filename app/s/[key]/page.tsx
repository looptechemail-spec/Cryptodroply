import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { getCategories, pick } from '@/lib/content'
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

  const categories = (await getCategories()).filter((c) => c.wixId && section.collections.includes(c.wixId))
  const tools = await db.tool.findMany({
    where: { status: 'PUBLISHED', category: { wixId: { in: section.collections } } },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    include: { translations: true, category: true },
  })

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
        <p style={{ marginTop: 16 }}>
          {categories.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ', '}
              <Link href={`/${c.slug}`} style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {c.name} ({c.count})
              </Link>
            </span>
          ))}
        </p>
      </div>
      <div className="tool-list">
        {tools.map((t) => (
          <Link key={t.id} href={`/${t.category.slug}/${t.slug}`} className="tool-row">
            <div className="lg">{t.logoUrl && <img src={t.logoUrl} alt="" loading="lazy" />}</div>
            <div>
              <div className="t">{t.title}</div>
              <div className="d">{pick(t.translations)?.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
