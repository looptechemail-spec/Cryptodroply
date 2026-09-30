import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategories, getSectionTools } from '@/lib/content'
import CategoryAccordion, { type Group } from '@/components/CategoryAccordion'
import { SECTIONS, CATEGORY_BLURBS, CATEGORY_INTROS } from '@/lib/sections'

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
  const tools = await getSectionTools(section.collections, 300)
  const groups: Group[] = cats
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      blurb: CATEGORY_BLURBS[c.wixId!] ?? '',
      intro: CATEGORY_INTROS[c.wixId!] ?? '',
      count: c.count,
      tools: tools.filter((t) => t.categorySlug === c.slug),
    }))
    .filter((g) => g.tools.length)

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
        <p className="section-intro">{section.intro}</p>
      </div>
      <CategoryAccordion groups={groups} pro={section.pro} />
    </div>
  )
}
