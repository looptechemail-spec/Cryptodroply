import { headers } from 'next/headers'
import { getLang, lp, stripLang } from '@/lib/i18n'

const IT = (
  <svg viewBox="0 0 30 20" width="26" height="17" aria-hidden="true" focusable="false">
    <rect width="10" height="20" fill="#009246" />
    <rect x="10" width="10" height="20" fill="#fff" />
    <rect x="20" width="10" height="20" fill="#ce2b37" />
  </svg>
)
const GB = (
  <svg viewBox="0 0 60 40" width="26" height="17" aria-hidden="true" focusable="false">
    <rect width="60" height="40" fill="#012169" />
    <path d="M0 0L60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
    <path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" strokeWidth="3" />
    <path d="M30 0V40M0 20H60" stroke="#fff" strokeWidth="13" />
    <path d="M30 0V40M0 20H60" stroke="#c8102e" strokeWidth="8" />
  </svg>
)

/** Bandierine italiana e inglese: portano alla stessa pagina nell'altra lingua. */
export default async function LangSwitch() {
  const lang = await getLang()
  const raw = (await headers()).get('x-pathname') ?? '/'
  const base = stripLang(raw)
  const items = [
    { code: 'it' as const, label: 'Italiano', flag: IT, href: lp(base, 'it') },
    { code: 'en' as const, label: 'English', flag: GB, href: base },
  ]
  return (
    <div className="lang-switch" role="group" aria-label="Language / Lingua">
      {items.map((x) => (
        <a key={x.code} href={x.href} hrefLang={x.code} lang={x.code} title={x.label} aria-label={x.label} aria-current={lang === x.code ? 'true' : undefined} className={lang === x.code ? 'on' : ''}>
          {x.flag}
        </a>
      ))}
    </div>
  )
}
