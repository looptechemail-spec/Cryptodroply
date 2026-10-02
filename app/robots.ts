import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.SITE_URL ?? 'https://www.cryptodroply.com').replace(/\/$/, '')
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/account', '/login', '/signup', '/forgot', '/reset', '/go/', '/r/', '/it/admin', '/it/account', '/it/login', '/it/signup', '/it/forgot', '/it/reset', '/it/go/', '/it/r/'] }],
    sitemap: `${base}/sitemap.xml`,
  }
}
