import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { pick } from '@/lib/content'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ category: string }> }

async function load(param: string) {
  const slug = param.startsWith('pro-') ? param.slice(4) : param
  return db.category.findUnique({
    where: { slug },
    include: {
      translations: true,
      tools: {
        where: { status: 'PUBLISHED' },
        orderBy: { sortOrder: 'asc' },
        include: { translations: true },
      },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const c = await load(category)
  const name = c && pick(c.translations)?.name
  return name ? { title: name } : {}
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const c = await load(category)
  if (!c) notFound()
  const pro = category.startsWith('pro-')
  const base = pro ? `/pro-${c.slug}` : `/${c.slug}`
  const name = pick(c.translations)?.name ?? c.slug

  return (
    <div className="container">
      <div className="page-head">
        <h1>{name}</h1>
        <p style={{ fontSize: 20, maxWidth: 640 }}>{pick(c.translations)?.description}</p>
      </div>
      <div className="tool-list">
        {c.tools.map((t) => (
          <Link key={t.id} href={`${base}/${t.slug}`} className="tool-row">
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
