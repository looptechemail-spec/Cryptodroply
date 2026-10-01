/** Conversione del contenuto degli articoli Wix (Ricos, JSON) in Markdown. Le immagini passano da imgMap (id Wix -> indirizzo). */
type N = { type: string; nodes?: N[]; [k: string]: any }

const escapeText = (t: string) => t.replace(/([\\`*\[\]|])/g, '\\$1')

function text(n: N): string {
  const raw: string = n.textData?.text ?? ''
  if (!raw.trim()) return raw
  const lead = raw.match(/^\s*/)![0]
  const trail = raw.match(/\s*$/)![0]
  let core = escapeText(raw.trim())
  const decos: any[] = n.textData?.decorations ?? []
  if (decos.some((d) => d.type === 'ITALIC')) core = `*${core}*`
  if (decos.some((d) => d.type === 'BOLD')) core = `**${core}**`
  const link = decos.find((d) => d.type === 'LINK')?.linkData?.link?.url
  if (link) core = `[${core}](${link})`
  return lead + core + trail
}

function inline(nodes: N[] = []): string {
  return nodes.map((n) => (n.type === 'TEXT' ? text(n) : n.type === 'HARD_BREAK' ? '  \n' : inline(n.nodes))).join('')
}

function list(n: N, imgMap: Map<string, string>, depth: number): string[] {
  const ordered = n.type === 'ORDERED_LIST'
  const out: string[] = []
  let i = 1
  for (const item of n.nodes ?? []) {
    const pad = '  '.repeat(depth)
    const para = (item.nodes ?? []).filter((c) => c.type === 'PARAGRAPH').map((c) => inline(c.nodes).trim()).filter(Boolean).join(' ')
    out.push(`${pad}${ordered ? `${i++}.` : '-'} ${para}`)
    for (const c of item.nodes ?? []) if (c.type === 'BULLETED_LIST' || c.type === 'ORDERED_LIST') out.push(...list(c, imgMap, depth + 1))
  }
  return out
}

function imageMd(src: string | undefined, alt: string | undefined, imgMap: Map<string, string>) {
  if (!src) return ''
  return `![${(alt ?? '').replace(/[\[\]]/g, '')}](${imgMap.get(src) ?? src})`
}

/** Gli id delle immagini usate nell'articolo (per copiarle prima della conversione). */
export function ricosImageIds(nodes: N[] = []): string[] {
  const ids: string[] = []
  const walk = (n: N) => {
    if (n.type === 'IMAGE') { const id = n.imageData?.image?.src?.id ?? n.imageData?.image?.src?.url; if (id) ids.push(id) }
    if (n.type === 'GALLERY') for (const it of n.galleryData?.items ?? []) { const id = it.image?.media?.src?.id; if (id) ids.push(id) }
    ;(n.nodes ?? []).forEach(walk)
  }
  nodes.forEach(walk)
  return [...new Set(ids)]
}

export function ricosToMarkdown(nodes: N[] = [], imgMap = new Map<string, string>()): string {
  const blocks: string[] = []
  for (const n of nodes) {
    switch (n.type) {
      case 'PARAGRAPH': {
        let t = inline(n.nodes).trim()
        if (!t) break
        if (/^(#|-|\+|>|\d+\.)/.test(t)) t = '\\' + t
        blocks.push(t)
        break
      }
      case 'HEADING': {
        const t = inline(n.nodes).trim()
        if (t) blocks.push(`${'#'.repeat(Math.min(Math.max(n.headingData?.level ?? 2, 1), 6))} ${t}`)
        break
      }
      case 'BULLETED_LIST':
      case 'ORDERED_LIST':
        blocks.push(list(n, imgMap, 0).join('\n'))
        break
      case 'IMAGE': {
        const d = n.imageData ?? {}
        const md = imageMd(d.image?.src?.id ?? d.image?.src?.url, d.altText ?? d.caption, imgMap)
        if (md) blocks.push(md)
        break
      }
      case 'GALLERY': {
        for (const it of n.galleryData?.items ?? []) {
          const md = imageMd(it.image?.media?.src?.id, it.image?.media?.altText, imgMap)
          if (md) blocks.push(md)
        }
        break
      }
      case 'DIVIDER':
        blocks.push('---')
        break
      case 'BLOCKQUOTE': {
        const t = (n.nodes ?? []).map((c) => inline(c.nodes).trim()).filter(Boolean).join('\n\n')
        if (t) blocks.push(t.split('\n').map((l) => `> ${l}`).join('\n'))
        break
      }
      case 'CODE_BLOCK': {
        const t = (n.nodes ?? []).map((c) => c.textData?.text ?? '').join('\n')
        blocks.push('```\n' + t + '\n```')
        break
      }
      case 'LINK_PREVIEW': {
        const url = n.linkPreviewData?.link?.url
        if (url) blocks.push(`[${url}](${url})`)
        break
      }
      case 'TABLE': {
        const rows = (n.nodes ?? []).map((r) => (r.nodes ?? []).map((c) => inline((c.nodes ?? []).flatMap((x) => x.nodes ?? [])).replace(/\s+/g, ' ').trim() || ' '))
        if (rows.length) {
          const cols = Math.max(...rows.map((r) => r.length))
          const line = (r: string[]) => `| ${Array.from({ length: cols }, (_, i) => r[i] ?? ' ').join(' | ')} |`
          blocks.push([line(rows[0]), `| ${Array(cols).fill('---').join(' | ')} |`, ...rows.slice(1).map(line)].join('\n'))
        }
        break
      }
      default:
        break
    }
  }
  return blocks.join('\n\n')
}
