'use client'
import { usePathname } from 'next/navigation'
import type { Lang } from '@/lib/i18n'

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

const NO_PREFIX = /^\/(api|admin|media|go|r)([/?#]|$)/

function stripLang(path: string): string {
  if (path === '/it') return '/'
  return path.startsWith('/it/') ? path.slice(3) : path
}

/** Bandierine italiana e inglese: portano alla stessa pagina nell'altra lingua. È un componente client perché l'intestazione resta
 *  montata quando si naviga tra le pagine: l'indirizzo va letto dalla pagina attuale, non da quella in cui si è entrati. */
export default function LangSwitch({ lang }: { lang: Lang }) {
  const base = stripLang(usePathname() || '/')
  const itHref = NO_PREFIX.test(base) ? base : base === '/' ? '/it' : '/it' + base
  const items = [
    { code: 'it' as const, label: 'Italiano', flag: IT, href: itHref },
    { code: 'en' as const, label: 'English', flag: GB, href: base },
  ]
  return (
    <div className="lang-switch" role="group" aria-label="Language / Lingua">
      {items.map((x) => (
        <a
          key={x.code}
          href={x.href}
          hrefLang={x.code}
          lang={x.code}
          title={x.label}
          aria-label={x.label}
          aria-current={lang === x.code ? 'true' : undefined}
          className={lang === x.code ? 'on' : ''}
          onClick={(e) => {
            e.preventDefault()
            window.location.assign(x.href + window.location.search + window.location.hash)
          }}
        >
          {x.flag}
        </a>
      ))}
    </div>
  )
}
