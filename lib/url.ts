/** Indirizzo pubblico del sito per i redirect: dietro Railway req.url è l'indirizzo interno (localhost). */
export function absUrl(path: string, req: Request): URL {
  const h = req.headers
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host && !/^(localhost|127\.|0\.0\.0\.0)/.test(host)) {
    const proto = h.get('x-forwarded-proto')?.split(',')[0] ?? 'https'
    return new URL(path, `${proto}://${host}`)
  }
  return new URL(path, process.env.SITE_URL ?? req.url)
}
