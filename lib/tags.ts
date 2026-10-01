/**
 * Tag con emoji e filtri, ricavati dai campi di ogni categoria (Circuito, Piattaforma, KYC, Cashback...).
 * Nessun dato in più da gestire: si calcolano dai valori che gli strumenti hanno già.
 */
export type Tag = { emoji: string; label: string }
export type FacetOption = { value: string; label: string; emoji: string; count: number }
export type Facet = { id: string; label: string; emoji: string; kind: 'bool' | 'multi'; options: FacetOption[] }
type Def = { key: string; labelEn: string }
type Analyzed = { tags: Tag[]; vals: Record<string, string[]> }

// campi che non sono caratteristiche (testi lunghi, link, ordinamenti...)
const SKIP = /^(star rate|rating|manual sort|ordine|order|ref ?link|reflink|link video|video\d*|titolo.*|created\d*|creator\d*|img.*|image|logo|full description|description|cos'?è|what is it|come funziona|how it works|quando usarlo|when to use it|risks?|referral type|publish date|unpublish date|status|id)$/i

// nomi dei campi arrivati in italiano da Wix
const LABELS: Record<string, string> = {
  circuito: 'Card network', custodia: 'Custody', sede: 'Based in', 'monete supportate': 'Supported coins',
  'spese mensili': 'Monthly fees', 'virtuale carta': 'Virtual card', 'fisica carta': 'Physical card',
  'carta deposito': 'Card deposit', 'crypto deposito': 'Crypto deposit', 'sepa deposito': 'SEPA deposit',
  'fee cambio': 'FX fee', 'dex cex': 'DEX / CEX', opensource: 'Open source', 'free / paid': 'Free / Paid',
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
export const labelOf = (raw: string) => cap(LABELS[raw.trim().toLowerCase()] ?? raw.trim())

const LABEL_EMOJI: [RegExp, string][] = [
  [/difficult/, '🎯'], [/platform/, '🖥️'], [/custod/, '🔐'], [/kyc/, '🪪'], [/cashback/, '💸'], [/fee/, '🧾'],
  [/risk/, '⚠️'], [/yield/, '📈'], [/asset/, '🪙'], [/reward/, '🎁'], [/frequen/, '⏱️'], [/require/, '📋'],
  [/claim/, '🖱️'], [/earning/, '💰'], [/referral/, '🤝'], [/open ?source/, '🔓'], [/free/, '🆓'], [/access/, '🌐'],
  [/browser/, '🌐'], [/mobile/, '📱'], [/^pc$|desktop/, '💻'], [/dapp/, '🧩'], [/iban/, '🏦'], [/sepa/, '🇪🇺'],
  [/deposit/, '💵'], [/virtual|physical/, '💳'], [/based in|sede/, '📍'], [/dex/, '⚖️'], [/card network/, '💠'],
  [/chain|network/, '🔗'], [/coins|crypto/, '🪙'], [/monthly/, '📆'], [/type/, '🧩'],
]
const labelEmoji = (label: string) => LABEL_EMOJI.find(([r]) => r.test(label.toLowerCase()))?.[1] ?? '🏷️'

const VALUE_EMOJI: [RegExp, string][] = [
  [/^high$/, '🔴'], [/^medium$/, '🟡'], [/^low$/, '🟢'], [/^pc$/, '💻'], [/^(android|ios)$/, '📱'], [/^web$/, '🌐'],
  [/^(btc|bitcoin)$/, '₿'], [/^(eth|ethereum)$/, '🔷'], [/^(xmr|monero)$/, '🕶️'], [/^multi$/, '🌍'], [/^free/, '🆓'],
  [/no kyc/, '🕶️'], [/kyc/, '🪪'], [/non.?custodial|selfc|self.?custod/, '🗝️'], [/^custodial/, '🏛️'],
  [/^(visa|mastercard)$/, '💳'], [/^email$/, '📧'], [/^(game|games)$/, '🎮'], [/^cex$/, '🏦'], [/^dex$/, '🔀'],
]
const valueEmoji = (v: string) => VALUE_EMOJI.find(([r]) => r.test(v.toLowerCase()))?.[1]

const CANON: Record<string, string> = { pc: 'PC', ios: 'iOS', android: 'Android', web: 'Web', btc: 'BTC', xmr: 'XMR', eth: 'ETH', evm: 'EVM', kyc: 'KYC', 'no kyc': 'No KYC', cex: 'CEX', dex: 'DEX' }
const YES = /^(yes|✅|true|si|sì)\b/i
const NO = /^(no|❌|false)$/i

function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && (ch === ',' || ch === '\n' || ch === ';')) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out
}

function tokens(raw: string): { label: string; emoji?: string }[] {
  const res: { label: string; emoji?: string }[] = []
  for (let part of splitTop(raw)) {
    part = part.replace(/\s*\([^)]*\)?/g, '').replace(/\*+$/, '').trim()
    if (!part) continue
    let emoji: string | undefined
    const m = part.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u)
    if (m) { emoji = m[1]; part = m[2].trim() }
    if (!part || /^n\/a$/i.test(part)) continue
    part = CANON[part.toLowerCase()] ?? cap(part)
    res.push({ label: part, emoji })
  }
  return res
}

export function analyze(defs: Def[], tools: { id: string; attributes: unknown }[]): { facets: Facet[]; tools: Record<string, Analyzed> } {
  const out: Record<string, Analyzed> = Object.fromEntries(tools.map((t) => [t.id, { tags: [], vals: {} }]))
  const facets: Facet[] = []
  const tipDef = defs.find((d) => d.key.toLowerCase() === 'tip' || d.labelEn.trim().toLowerCase() === 'tip')

  // i suggerimenti ("TIP") sono già brevi frasi: diventano i primi tag
  if (tipDef) {
    for (const t of tools) {
      const raw = String(((t.attributes ?? {}) as Record<string, unknown>)[tipDef.key] ?? '')
      const lines = raw.split(/\n/).map((l) => l.replace(/[.\s]+$/, '').trim()).filter(Boolean).slice(0, 2)
      out[t.id].tags.push(...lines.map((l) => ({ emoji: valueEmoji(l) ?? '✨', label: cap(l) })))
    }
  }

  for (const d of defs) {
    if (d === tipDef || SKIP.test(d.labelEn.trim()) || SKIP.test(d.key)) continue
    const label = labelOf(d.labelEn)
    const emoji = labelEmoji(label)
    const raws = tools.map((t) => String(((t.attributes ?? {}) as Record<string, unknown>)[d.key] ?? '').trim())
    const filled = raws.filter(Boolean)
    if (!filled.length || filled.some((r) => /^https?:\/\//i.test(r))) continue

    const boolish = filled.filter((r) => YES.test(r) || NO.test(r)).length
    if (boolish / filled.length >= 0.8) {
      let yes = 0
      tools.forEach((t, i) => {
        if (!YES.test(raws[i])) return
        yes++
        out[t.id].vals[d.key] = ['yes']
        const extra = raws[i].replace(YES, '').replace(/^[,:\s]+/, '').trim()
        out[t.id].tags.push({ emoji, label: extra && extra.length <= 14 ? `${label} ${extra}` : label })
      })
      if (yes >= 1 && yes < tools.length) facets.push({ id: d.key, label, emoji, kind: 'bool', options: [{ value: 'yes', label, emoji, count: yes }] })
      continue
    }

    const per = raws.map(tokens)
    const all = per.flat()
    if (!all.length || all.filter((x) => x.label.length > 28).length / all.length > 0.25) continue
    const opts = new Map<string, FacetOption>()
    tools.forEach((t, i) => {
      const seen = new Set<string>()
      per[i].filter((x) => x.label.length <= 28).forEach((x, n) => {
        const k = x.label.toLowerCase()
        const e = x.emoji ?? valueEmoji(x.label) ?? emoji
        if (!seen.has(k)) {
          seen.add(k)
          const o = opts.get(k) ?? { value: k, label: x.label, emoji: e, count: 0 }
          o.count++
          opts.set(k, o)
        }
        if (n < 2 && !out[t.id].tags.some((g) => g.label.toLowerCase() === k)) out[t.id].tags.push({ emoji: e, label: x.label })
      })
      out[t.id].vals[d.key] = [...seen]
    })
    if (opts.size >= 2 && opts.size <= 14) {
      facets.push({ id: d.key, label, emoji, kind: 'multi', options: [...opts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)) })
    }
  }
  return { facets, tools: out }
}

/** I tag di un solo strumento (per la sua pagina). */
export function toolTags(defs: Def[], attributes: unknown): Tag[] {
  return analyze(defs, [{ id: 'x', attributes }]).tools.x.tags
}
