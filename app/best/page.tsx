import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import type { Metadata } from 'next'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Best crypto tools by category', 'I migliori strumenti crypto per categoria'),
    description: t('Curated lists of the best crypto wallets, exchanges, airdrop tools and more, with plain guides.', 'Elenchi curati dei migliori wallet, exchange, strumenti per airdrop e altro, con guide semplici.'),
  }
}

export default async function BestIndex() {
  const { t } = await i18n()
  const pages = await db.seoPage.findMany({ where: { status: 'PUBLISHED' }, orderBy: { title: 'asc' } })
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="page-head"><h1>{t('Best crypto tools', 'I migliori strumenti crypto')}</h1><p className="section-intro">{t('Curated lists, each tool with a plain guide.', 'Elenchi curati, ogni strumento con una guida semplice.')}</p></div>
      {pages.length === 0 && <p>{t('Coming soon.', 'In arrivo.')}</p>}
      <ul className="seo-list">{pages.map((p) => <li key={p.id}><Link href={`/best/${p.slug}`}>{p.title}</Link></li>)}</ul>
    </div>
  )
}
