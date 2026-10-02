import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'

export default async function BlogTabs({ active }: { active: 'blog' | 'analyses' }) {
  const { t } = await i18n()
  return (
    <div className="blog-tabs">
      <Link href="/blog" className={active === 'blog' ? 'on' : ''}>
        <b>Blog</b>
        <small>{t('Guides and news, free for everyone', 'Guide e novità, gratis per tutti')}</small>
      </Link>
      <Link href="/analyses" className={active === 'analyses' ? 'on' : ''}>
        <b>
          {t('Analyses', 'Analisi')} <span className="badge-pro">PRO</span>
        </b>
        <small>{t('In-depth analysis, for PRO members only', 'Analisi approfondite, solo per chi ha PRO')}</small>
      </Link>
    </div>
  )
}
