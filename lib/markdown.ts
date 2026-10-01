import { cleanText } from './clean'

/** Piccolo convertitore Markdown -> HTML per gli articoli (titoli, paragrafi, elenchi, immagini, link, grassetto, corsivo, citazioni, codice). */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const safeUrl = (u: string) => (/^(https?:\/\/|\/|mailto:|#)/i.test(u.trim()) ? esc(u.trim()) : '#')

function inline(src: string): string {
  const keep: string[] = []
  // caratteri protetti con la barra inversa
  let s = cleanText(src).replace(/\\([\\`*\[\]#+\->.\d|])/g, (_m, c) => `\u0000${keep.push(c) - 1}\u0001`)
  s = esc(s)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => `<img src="${safeUrl(url.replace(/&amp;/g, '&'))}" alt="${alt}" loading="lazy">`)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, url) => {
    const u = url.replace(/&amp;/g, '&')
    const ext = /^https?:\/\//i.test(u)
    return `<a href="${safeUrl(u)}"${ext ? ' rel="nofollow noopener" target="_blank"' : ''}>${t}</a>`
  })
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
  s = s.replace(/ {2}\n/g, '<br>')
  return s.replace(/\u0000(\d+)\u0001/g, (_m, i) => esc(keep[Number(i)]))
}

type Item = { text: string; ordered: boolean; children: Item[] }

function renderItems(items: Item[]): string {
  if (!items.length) return ''
  const tag = items[0].ordered ? 'ol' : 'ul'
  return `<${tag}>${items.map((i) => `<li>${inline(i.text)}${renderItems(i.children)}</li>`).join('')}</${tag}>`
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r/g, '').split('\n')
  const out: string[] = []
  const isBlockStart = (l: string) => /^(#{1,6}\s|```|>|\||\s*([-*+]|\d+\.)\s|-{3,}\s*$)/.test(l)
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }
    if (l.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`)
      continue
    }
    if (l.trim().startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      const [head, ...body] = rows
      out.push(`<div class="md-table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`)
      continue
    }
    const h = l.match(/^(#{1,6})\s+(.*)$/)
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue }
    if (/^-{3,}\s*$/.test(l)) { out.push('<hr>'); i++; continue }
    if (l.startsWith('>')) {
      const q: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) q.push(lines[i++].replace(/^>\s?/, ''))
      out.push(`<blockquote>${inline(q.join(' '))}</blockquote>`)
      continue
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(l)) {
      const root: Item[] = []
      const stack: { indent: number; list: Item[] }[] = [{ indent: -1, list: root }]
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/)!
        const indent = m[1].length
        const item: Item = { text: m[3], ordered: /\d/.test(m[2]), children: [] }
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
        stack[stack.length - 1].list.push(item)
        stack.push({ indent, list: item.children })
        i++
      }
      out.push(renderItems(root))
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !(para.length && isBlockStart(lines[i]))) para.push(lines[i++])
    out.push(`<p>${inline(para.join('\n'))}</p>`)
  }
  return out.join('\n')
}
