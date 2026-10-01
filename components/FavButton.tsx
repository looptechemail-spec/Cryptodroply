'use client'
import { useState } from 'react'

export function FavButton({ toolId, initial, loggedIn }: { toolId: string; initial: boolean; loggedIn: boolean }) {
  const [saved, setSaved] = useState(initial)
  const [busy, setBusy] = useState(false)
  async function toggle() {
    if (!loggedIn) { window.location.href = '/login'; return }
    setBusy(true)
    try {
      const r = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toolId }) })
      if (r.ok) setSaved((await r.json()).saved)
    } finally { setBusy(false) }
  }
  return (
    <button type="button" className="fav-btn" aria-pressed={saved} onClick={toggle} disabled={busy}>
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
