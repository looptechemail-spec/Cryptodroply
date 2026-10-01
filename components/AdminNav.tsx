import Link from 'next/link'

const LINKS = [
  ['/admin', 'Dashboard'], ['/admin/tools', 'Tools'], ['/admin/users', 'Users'],
  ['/admin/referrals', 'Referrals'], ['/admin/subscribers', 'Subscribers'], ['/admin/newsletter', 'Campaigns'], ['/admin/social', 'Social'], ['/admin/messages', 'Messages'], ['/admin/import', 'Import'],
] as const

export function AdminNav() {
  return (
    <nav className="admin-nav">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href}>{label}</Link>
      ))}
      <form method="post" action="/api/admin/logout" style={{ display: 'inline' }}>
        <button className="btn btn-outline-dark btn-sm" type="submit">Log out</button>
      </form>
    </nav>
  )
}
