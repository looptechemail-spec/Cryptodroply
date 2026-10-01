'use client'
import { useState } from 'react'

export function CopyLink({ value }: { value: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="copy-link">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label="Your referral link" />
      <button
        type="button"
        className="btn btn-blue"
        onClick={async () => {
          try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000) } catch { /* l'utente può copiare a mano */ }
        }}
      >
        {done ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
