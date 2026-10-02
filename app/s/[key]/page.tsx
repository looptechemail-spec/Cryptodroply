import { i18n } from '@/lib/i18n'
import { sec, blurbOf, introOf } from '@/lib/sections-it'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCategories, getSectionData } from '@/lib/content'
import CategoryAccordion, { type Group } from '@/components/CategoryAccordion'
import { SECTIONS, CATEGORY_BLURBS, CATEGORY_INTROS } from '@/lib/sections'
import { hasPro } from '@/lib/access'
import { Paywall } from '@/components/Paywall'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ key: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params
  const { it } = await i18n()
  const found = SECTIONS.find((x) => x.key === key)
  const s = found && sec(found, it)
  return s ? { title: s.title, description: s.description, ...(s.pro ? { robots: { index: false, follow: false } } : {}) } : {}
}

export default async function SectionPage({ params }: Props) {
  const { key } = await params
  const { t, it, lang, loc } = await i18n()
  const base = SECTIONS.find((s) => s.key === key)
  if (!base) notFound()
  const section = sec(base, it)

  const locked = section.pro && !(await hasPro())
  const cats = locked ? [] : (await getCategories(loc)).filter((c) => c.wixId && section.collections.includes(c.wixId))
  const data = locked ? { tools: [], facets: {} as Record<string, import('@/lib/tags').Facet[]> } : await getSectionData(section.collections, 300, loc)
  const tools = data.tools
  const groups: Group[] = cats
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      blurb: blurbOf(c.wixId!, CATEGORY_BLURBS, it),
      intro: introOf(c.wixId!, CATEGORY_INTROS, it),
      count: c.count,
      tools: tools.filter((t) => t.categorySlug === c.slug),
      facets: data.facets[c.slug] ?? [],
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
      {locked ? (
        <Paywall title={t(`${section.title} is for PRO members`, `${section.title} è riservata a chi ha PRO`)} text={`${section.description}`} />
      ) : (
        <CategoryAccordion groups={groups} pro={section.pro} lang={lang} />
      )}
    </div>
  )
}
