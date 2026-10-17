/** Tutto ciò che aspetta l'OK dell'admin, in un posto solo. */
import { db } from './db'
import { isAnalysis } from './agent'

export async function pendingApprovals() {
  const [articles, tasks, campaigns, seo, social] = await Promise.all([
    db.post.findMany({
      where: { status: 'DRAFT' },
      include: { translations: true, category: { select: { slug: true } } },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 50,
    }),
    db.agentTask.findMany({ where: { status: 'PROPOSED' }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.campaign.findMany({ where: { sentAt: null }, orderBy: { createdAt: 'desc' }, take: 20 }),
    db.seoPage.count({ where: { status: 'DRAFT' } }),
    db.socialPost.count({ where: { status: 'DRAFT' } }),
  ])
  const items = articles.map((p) => {
    const en = p.translations.find((t) => t.locale === 'EN')
    return {
      id: p.id, slug: p.slug, title: en?.title ?? p.translations[0]?.title ?? p.slug, excerpt: en?.excerpt ?? '',
      cover: p.coverUrl, scheduledAt: p.scheduledAt, access: p.access, analysis: isAnalysis(p),
      hasText: !!(en && en.title && en.contentMd),
    }
  })
  return { articles: items, tasks, campaigns, seo, social, total: items.length + tasks.length + campaigns.length + social }
}

export async function pendingCount(): Promise<number> {
  const [a, t, c, s] = await Promise.all([
    db.post.count({ where: { status: 'DRAFT' } }),
    db.agentTask.count({ where: { status: 'PROPOSED' } }),
    db.campaign.count({ where: { sentAt: null } }),
    db.socialPost.count({ where: { status: 'DRAFT' } }),
  ])
  return a + t + c + s
}
