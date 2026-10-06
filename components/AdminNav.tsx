'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  ['/admin', 'Dashboard'], ['/admin/tools', 'Strumenti'], ['/admin/videos', 'Video'], ['/admin/users', 'Utenti'],
  ['/admin/referrals', 'Referral'], ['/admin/subscribers', 'Iscritti'], ['/admin/newsletter', 'Campagne'], ['/admin/emails', 'Email'], ['/admin/articles', 'Articoli'], ['/admin/tool-posts', 'Post strumenti'], ['/admin/news', 'Post news'], ['/admin/messages', 'Messaggi'], ['/admin/import', 'Importa'], ['/admin/import-project', 'Importa progetto'], ['/admin/legacy', 'Vecchi contatti'], ['/admin/pro-grants', 'PRO vecchi clienti'], ['/admin/creators', 'Creator'], ['/admin/launch', 'Controllo lancio'], ['/admin/translate', 'Traduzioni'],
] as const

export function AdminNav() {
  const path = (usePathname() ?? '').replace(/\/$/, '')
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(href + '/'))
  return (
    <nav className="admin-nav">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
          style={active(href) ? { background: '#3C53F4', color: '#fff', fontWeight: 800 } : undefined}>{label}</Link>
      ))}
      <form method="post" action="/api/admin/logout" style={{ display: 'inline' }}>
        <button className="btn btn-outline-dark btn-sm" type="submit">Esci</button>
      </form>
    </nav>
  )
}
