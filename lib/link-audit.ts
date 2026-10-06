/** Controllo dei link degli strumenti: segnala siti che non rispondono e indirizzi che non somigliano al nome dello strumento. Non modifica nulla. */
import { db } from './db'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

async function probe(url: string): Promise<{ status: number; final: string } | { error: string }> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 12000)
  try {
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; CryptodroplyLinkCheck/1.0)' } })
    if (r.status === 405 || r.status === 403 || r.status === 400) r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; CryptodroplyLinkCheck/1.0)' } })
    return { status: r.status, final: r.url }
  } catch (e) {
    return { error: ((e as Error).cause as any)?.code ?? (e as Error).message ?? 'errore' }
  } finally { clearTimeout(timer) }
}

export async function auditToolLinks(log: (m: string) => void = () => {}) {
  const tools = await db.tool.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, title: true, slug: true, websiteUrl: true, refLink: true } })
  const out: string[] = []
  let checked = 0
  const queue = tools.filter((t) => t.websiteUrl)
  for (const t of tools) if (t.refLink && /youtube\.com|youtu\.be/i.test(t.refLink)) out.push(`AFFILIAZIONE = VIDEO YOUTUBE (il pulsante porta al video): ${t.title} -> ${t.refLink}`)
  const noSite = tools.filter((t) => !t.websiteUrl).map((t) => t.title)
  if (noSite.length) out.push(`SENZA SITO: ${noSite.join(', ')}`)
  const worker = async () => {
    for (;;) {
      const t = queue.pop()
      if (!t) return
      const url = t.websiteUrl!
      let host = ''
      try { host = new URL(url).hostname.replace(/^www\./, '') } catch { out.push(`LINK NON VALIDO: ${t.title} -> ${url}`); continue }
      const res = await probe(url)
      checked++
      if ('error' in res) out.push(`NON RISPONDE: ${t.title} -> ${url} (${res.error})`)
      else if (res.status === 404 || res.status === 410 || res.status >= 500) out.push(`ERRORE ${res.status}: ${t.title} -> ${url}`)
      else if (res.status >= 400) out.push(`BLOCCA I CONTROLLI (${res.status}), da guardare a mano: ${t.title} -> ${url}`)
      // l'indirizzo finale non somiglia al nome: possibile sito sbagliato
      const name = norm(t.title.replace(/\b(wallet|exchange|app|pro|protocol|network|testnet|airdrop|faucet)\b/gi, ''))
      const finalHost = norm(('final' in res ? new URL(res.final).hostname : host).replace(/^www\./, '').split('.').slice(0, -1).join(''))
      if (name.length >= 4 && finalHost && !finalHost.includes(name) && !name.includes(finalHost)) out.push(`NOME E SITO NON COMBACIANO: ${t.title} -> ${'final' in res ? res.final : url}`)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  log(`Link controllati: ${checked} su ${tools.length}. Problemi: ${out.length}`)
  for (const line of out) log(line)
  const key = `link-audit:${new Date().toISOString().slice(0, 10)}`
  const note = `${checked} link controllati, ${out.length} da guardare. ${out.slice(0, 12).join(' | ')}`.slice(0, 900)
  await db.jobRun.upsert({ where: { key }, update: { note }, create: { key, note } }).catch(() => undefined)
  return out
}
