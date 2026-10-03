/** Dati strutturati (schema.org) per motori di ricerca e assistenti AI. Valgono per ogni pagina, anche per quelle aggiunte in futuro: si generano dai dati del sito. */
export const siteBase = () => (process.env.SITE_URL ?? 'https://www.cryptodroply.com').replace(/\/$/, '')

export const absoluteUrl = (path: string | null | undefined, lang: 'en' | 'it' = 'en') => {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  const p = lang === 'it' && !/^\/(api|admin|media|go|r)([/?#]|$)/.test(path) ? (path === '/' ? '/it' : '/it' + path) : path
  return siteBase() + p
}

/** Testo semplice da un frammento HTML. */
export const plain = (html: string | null | undefined, max = 600) => {
  const t = (html ?? '').replace(/<\/(p|li|h\d)>/gi, '. ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim()
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : t
}

export function breadcrumbs(items: { name: string; path: string }[], lang: 'en' | 'it') {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: absoluteUrl(x.path, lang) })),
  }
}

export function itemList(name: string, description: string | undefined, items: { name: string; path: string; description?: string | null; image?: string | null }[], lang: 'en' | 'it', pagePath: string) {
  return {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name, description, inLanguage: lang, url: absoluteUrl(pagePath, lang),
    isPartOf: { '@type': 'WebSite', name: 'Cryptodroply', url: siteBase() },
    mainEntity: {
      '@type': 'ItemList', numberOfItems: items.length,
      itemListElement: items.slice(0, 100).map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(x.path, lang), name: x.name })),
    },
  }
}

export function toolLd(o: {
  name: string; description?: string | null; path: string; lang: 'en' | 'it'; category: string; image?: string | null; website?: string | null
  faq: { q: string; a: string }[]
}) {
  const app = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: o.name, description: o.description || undefined,
    applicationCategory: 'FinanceApplication', operatingSystem: 'Web, iOS, Android, Windows, macOS', inLanguage: o.lang,
    url: absoluteUrl(o.path, o.lang), image: absoluteUrl(o.image ?? undefined), sameAs: o.website ? [o.website] : undefined,
    genre: o.category,
    publisher: { '@type': 'Organization', name: 'Cryptodroply', url: siteBase() },
  }
  const faq = o.faq.filter((f) => f.a)
  return [
    app,
    ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
  ]
}
