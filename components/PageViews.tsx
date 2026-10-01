'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PageViews() {
  const path = usePathname()
  useEffect(() => {
    fetch('/api/track', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, referrer: document.referrer || null }),
    }).catch(() => undefined)
  }, [path])
  return null
}
