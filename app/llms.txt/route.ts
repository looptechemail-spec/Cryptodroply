import { db } from '@/lib/db'
import { SECTIONS } from '@/lib/sections'
import { isProCollection } from '@/lib/access'
import { siteBase, plain } from '@/lib/jsonld'

export const dynamic = 'force-dynamic'

/** Riassunto del sito per gli assistenti AI (llms.txt). Si genera dai dati: ogni nuova scheda o articolo gratuito compare da solo. Il contenuto PRO non è incluso. */
export async function GET() {
  const base = siteBase()
  const [cats, tools, posts] = await Promise.all([
    db.category.findMany({ include: { translations: true } }),
    db.tool.findMany({
      where: { status: 'PUBLISHED' },
      include: { translations: { where: { locale: 'EN' } }, category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      take: 1500,
    }),
    db.post.findMany({ where: { status: 'PUBLISHED', access: 'FREE' }, include: { translations: { where: { locale: 'EN' } } }, orderBy: { publishedAt: 'desc' }, take: 200 }),
  ])
  const free = tools.filter((t) => !isProCollection(t.category.wixId))
  const L: string[] = []
  L.push('# Cryptodroply', '')
  L.push('> Cryptodroply is a directory of crypto tools: wallets, exchanges, airdrops, faucets, tasks, games, security and analysis tools. Every tool has a plain guide: what it is, how it works and when to use it. Content is educational and neutral and is not financial advice. Available in English and Italian (add /it before any path for Italian).', '')
  L.push('## Sections', '')
  for (const s of SECTIONS.filter((x) => !x.pro)) L.push(`- [${s.title}](${base}/s/${s.key}): ${s.description}`)
  L.push('', '## Categories', '')
  for (const c of cats) {
    if (isProCollection(c.wixId)) continue
    const n = free.filter((t) => t.categoryId === c.id).length
    if (!n) continue
    const name = c.translations.find((x) => x.locale === 'EN')?.name ?? c.slug
    L.push(`- [${name}](${base}/${c.slug}): ${n} tools`)
  }
  L.push('', '## Tools', '')
  for (const t of free) {
    const d = plain(t.translations[0]?.description, 160)
    L.push(`- [${t.title}](${base}/${t.category.slug}/${t.slug})${d ? ': ' + d : ''}`)
  }
  L.push('', '## Articles', '')
  for (const p of posts) {
    const t = p.translations[0]
    if (t?.title) L.push(`- [${t.title}](${base}/post/${p.slug})${t.excerpt ? ': ' + plain(t.excerpt, 160) : ''}`)
  }
  L.push('', '## Other', '', `- [Pricing](${base}/pricing): free plan and PRO plan`, `- [Blog](${base}/blog)`, `- [Italian version](${base}/it)`, `- [Sitemap](${base}/sitemap.xml)`, '')
  return new Response(L.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
