'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export function FavButton({ toolId, initial, loggedIn, lang }: { toolId: string; initial: boolean; loggedIn: boolean; lang?: 'en' | 'it' }) {
  const pathname = usePathname()
  const it = (lang ?? (pathname === '/it' || pathname?.startsWith('/it/') ? 'it' : 'en')) === 'it'
  const [saved, setSaved] = useState(initial)
  const [busy, setBusy] = useState(false)
  async function toggle() {
    if (!loggedIn) { window.location.href = it ? '/it/login' : '/login'; return }
    setBusy(true)
    try {
      const r = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toolId }) })
      if (r.ok) setSaved((await r.json()).saved)
    } finally { setBusy(false) }
  }
  return (
    <button type="button" className="fav-btn" aria-pressed={saved} onClick={toggle} disabled={busy}>
      {saved ? (it ? 'Salvato' : 'Saved') : it ? 'Salva' : 'Save'}
    </button>
  )
}
