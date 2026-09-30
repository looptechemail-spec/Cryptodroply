import Link from 'next/link'

export default function BlogTabs({ active }: { active: 'blog' | 'analyses' }) {
  return (
    <div className="blog-tabs">
      <Link href="/blog" className={active === 'blog' ? 'on' : ''}>
        <b>Blog</b>
        <small>Guides and news, free for everyone</small>
      </Link>
      <Link href="/analyses" className={active === 'analyses' ? 'on' : ''}>
        <b>
          Analyses <span className="badge-pro">PRO</span>
        </b>
        <small>In-depth analysis, for PRO members only</small>
      </Link>
    </div>
  )
}
