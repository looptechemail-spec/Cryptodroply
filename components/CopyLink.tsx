'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export function CopyLink({ value, lang }: { value: string; lang?: 'en' | 'it' }) {
  const pathname = usePathname()
  const it = (lang ?? (pathname === '/it' || pathname?.startsWith('/it/') ? 'it' : 'en')) === 'it'
  const [done, setDone] = useState(false)
  return (
    <div className="copy-link">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label={it ? 'Il tuo link di invito' : 'Your referral link'} />
      <button
        type="button"
        className="btn btn-blue"
        onClick={async () => {
          try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000) } catch { /* l'utente può copiare a mano */ }
        }}
      >
        {done ? (it ? 'Copiato' : 'Copied') : it ? 'Copia' : 'Copy'}
      </button>
    </div>
  )
}
