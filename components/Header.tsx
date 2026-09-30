import Link from 'next/link'
import Logo from './Logo'
import { getCategories } from '@/lib/content'
import { SECTIONS, sectionHref, CATEGORY_BLURBS } from '@/lib/sections'

export default async function Header() {
  const categories = await getCategories().catch(() => [])
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <nav className="nav" aria-label="Main">
          {SECTIONS.map((s) => {
            const cats = categories.filter((c) => c.wixId && s.collections.includes(c.wixId))
            return (
              <div key={s.key} className="nav-item" tabIndex={0}>
                <Link href={sectionHref(s.key)} className="nav-link">
                  {s.title}
                  {s.pro && <span className="nav-pro">PRO</span>}
                  {cats.length > 0 && <span className="nav-caret" aria-hidden="true" />}
                </Link>
                {cats.length > 0 && (
                  <div className="menu">
                    <div className="menu-inner">
                      <Link href={sectionHref(s.key)} className="menu-all">
                        All {s.title.toLowerCase()}
                      </Link>
                      {cats.map((c) => (
                        <Link key={c.id} href={`/${c.slug}`} className="menu-item">
                          <span>
                            <b>{c.name}</b>
                            <small>{CATEGORY_BLURBS[c.wixId!]}</small>
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
          <Link href="/blog" className="nav-link">Blog</Link>
          <Link href="/analyses" className="nav-link">
            Analyses<span className="nav-pro">PRO</span>
          </Link>
        </nav>
        <Link href="/#plans" className="btn btn-blue btn-sm">
          Get started free
        </Link>
      </div>
    </header>
  )
}
