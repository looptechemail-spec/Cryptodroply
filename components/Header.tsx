import Link from 'next/link'
import Logo from './Logo'
import { SECTIONS, sectionHref } from '@/lib/sections'

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <nav className="nav" aria-label="Main">
          {SECTIONS.map((s) => (
            <Link key={s.key} href={sectionHref(s.key)}>
              {s.title}
              {s.pro ? ' (PRO)' : ''}
            </Link>
          ))}
          <Link href="/blog">Blog</Link>
        </nav>
        <Link href="/#plans" className="btn btn-blue btn-sm">
          Get started free
        </Link>
      </div>
    </header>
  )
}
