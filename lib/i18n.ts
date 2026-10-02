import { headers } from 'next/headers'

/** Lingue del sito: inglese (predefinita, senza prefisso) e italiano (prefisso /it). */
export type Lang = 'en' | 'it'

/** Prefisso /it solo per le pagine pubbliche: api, admin, media e link di tracciamento restano uguali. */
export function lp(path: string, lang: Lang): string {
  if (lang !== 'it' || !path.startsWith('/') || path.startsWith('//')) return path
  if (path === '/it' || path.startsWith('/it/') || path.startsWith('/it?') || path.startsWith('/it#')) return path
  if (/^\/(api|admin|media|go|r|s)([/?#]|$)/.test(path)) return path
  if (path === '/') return '/it'
  if (path.startsWith('/?') || path.startsWith('/#')) return '/it' + path.slice(1)
  return '/it' + path
}

/** Toglie il prefisso /it da un percorso. */
export function stripLang(path: string): string {
  const m = path.match(/^\/it(\/.*|\?.*|#.*)?$/)
  if (!m) return path
  const rest = m[1] ?? ''
  return rest === '' ? '/' : rest.startsWith('/') ? rest : '/' + rest
}

export async function getLang(): Promise<Lang> {
  try {
    return (await headers()).get('x-lang') === 'it' ? 'it' : 'en'
  } catch {
    return 'en'
  }
}

/**
 * Uso nelle pagine: const { t, loc, href } = await i18n()
 *   t('English text', 'Testo italiano')  ->  testo nella lingua della pagina
 *   loc                                  ->  'EN' | 'IT' per scegliere le traduzioni dal database
 *   href('/pricing')                     ->  '/it/pricing' nella versione italiana
 */
export async function i18n() {
  const lang = await getLang()
  return {
    lang,
    loc: (lang === 'it' ? 'IT' : 'EN') as 'EN' | 'IT',
    it: lang === 'it',
    t: (en: string, it: string) => (lang === 'it' ? it : en),
    href: (p: string) => lp(p, lang),
  }
}
