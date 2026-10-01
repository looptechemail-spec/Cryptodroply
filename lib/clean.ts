/** Pulizia dei testi: via trattini lunghi e punteggiatura "da AI" (virgolette ricurve, puntini unici, spazi speciali). */
export function cleanText(s: string | null | undefined, stripLead = true): string {
  if (!s) return ''
  return s
    .replace(/[   ]/g, ' ')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2') // intervalli: 2020–2024 -> 2020-2024
    .replace(/\s*[–—]\s*/g, ', ') // trattini lunghi -> virgola
    .replace(/ - /g, ', ') // trattino con spazi -> virgola
    .replace(stripLead ? /^,\s*/ : /^$/, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*([.!?:;])/g, '$1')
}

/** Come cleanText, ma solo sul testo fuori dai tag HTML. */
export function cleanHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/>([^<]+)</g, (_m, t: string) => `>${cleanText(t, false)}<`).replace(/\s+,/g, ',')
}
