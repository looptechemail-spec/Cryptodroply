import Link from './LocLink'
import Logo from './Logo'
import MobileNav from './MobileNav'
import LangSwitch from './LangSwitch'
import { i18n } from '@/lib/i18n'
import { sec, blurbOf } from '@/lib/sections-it'
import { getCategories } from '@/lib/content'
import { getUser } from '@/lib/auth'
import { SECTIONS, sectionHref, CATEGORY_BLURBS } from '@/lib/sections'

export default async function Header() {
  const { t, it, loc } = await i18n()
  const categories = await getCategories(loc).catch(() => [])
  const user = await getUser().catch(() => null)
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <nav className="nav" aria-label={t('Main', 'Principale')}>
          {SECTIONS.map((s0) => {
            const s = sec(s0, it)
            const cats = categories.filter((c) => c.wixId && s0.collections.includes(c.wixId))
            return (
              <div key={s0.key} className="nav-item" tabIndex={0}>
                <Link href={sectionHref(s0.key)} className="nav-link">
                  {s.title}
                  {s0.pro && <span className="nav-pro">PRO</span>}
                  {cats.length > 0 && <span className="nav-caret" aria-hidden="true" />}
                </Link>
                {cats.length > 0 && (
                  <div className="menu">
                    <div className="menu-inner">
                      <Link href={sectionHref(s0.key)} className="menu-all">
                        {t('All', 'Tutti:')} {s.title.toLowerCase()}
                      </Link>
                      {cats.map((c) => (
                        <Link key={c.id} href={`/${c.slug}`} className="menu-item">
                          <span>
                            <b>{c.name}</b>
                            <small>{blurbOf(c.wixId!, CATEGORY_BLURBS, it)}</small>
                          </span>
                          <em>{c.count}</em>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div className="nav-item" tabIndex={0}>
            <Link href="/blog" className="nav-link">
              Blog
              <span className="nav-caret" aria-hidden="true" />
            </Link>
            <div className="menu menu-right">
              <div className="menu-inner">
                <Link href="/blog" className="menu-item">
                  <span>
                    <b>Blog</b>
                    <small>{t('Guides and news, free for everyone.', 'Guide e notizie, gratis per tutti.')}</small>
                  </span>
                </Link>
                <Link href="/analyses" className="menu-item">
                  <span>
                    <b>{t('Analyses', 'Analisi')}</b>
                    <small>{t('In-depth analysis, for PRO members only.', 'Analisi approfondite, solo per i membri PRO.')}</small>
                  </span>
                  <em className="menu-pro">PRO</em>
                </Link>
              </div>
            </div>
          </div>
          <Link href="/pricing" className="nav-link">
            {t('Pricing', 'Prezzi')}
          </Link>
          {!user && (
            <Link href="/login" className="nav-link nav-mobile-only">
              {t('Log in', 'Accedi')}
            </Link>
          )}
        </nav>
        <LangSwitch />
        {user ? (
          <Link href="/account" className="btn btn-blue btn-sm">
            {t('Account', 'Account')}
          </Link>
        ) : (
          <div className="head-cta">
            <Link href="/login" className="nav-link">
              {t('Log in', 'Accedi')}
            </Link>
            <Link href="/signup" className="btn btn-blue btn-sm">
              {t('Get started free', 'Inizia gratis')}
            </Link>
          </div>
        )}
        <MobileNav openLabel={t('Open menu', 'Apri il menu')} closeLabel={t('Close menu', 'Chiudi il menu')} />
      </div>
    </header>
  )
}
