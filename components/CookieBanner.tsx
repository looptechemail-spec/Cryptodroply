'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const CONSENT = 'cd_consent'
const PENDING = 'cd_pending_ref'

function readConsent(): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + CONSENT + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

export default function CookieBanner() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref')
      if (ref && /^[a-z0-9]{6,20}$/i.test(ref)) sessionStorage.setItem(PENDING, ref)
    } catch {}
    if (!readConsent()) setOpen(true)
    const reopen = () => setOpen(true)
    window.addEventListener('cd-cookie-settings', reopen)
    return () => window.removeEventListener('cd-cookie-settings', reopen)
  }, [])

  function choose(value: 'yes' | 'no') {
    document.cookie = `${CONSENT}=${value}; max-age=${60 * 60 * 24 * 180}; path=/; samesite=lax; secure`
    let ref = ''
    try { ref = sessionStorage.getItem(PENDING) ?? ''; if (value === 'no') sessionStorage.removeItem(PENDING) } catch {}
    fetch('/api/consent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: value, ref }),
    }).catch(() => undefined)
    setOpen(false)
  }

  if (!open) return null
  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie settings">
      <p>
        We use only the cookies needed to log you in. With your OK we also remember the referral link that brought you here, so the person who invited you is credited. No advertising cookies.{' '}
        <Link href="/cookie-policy">Cookie policy</Link>
      </p>
      <div className="cookie-actions">
        <button type="button" className="cookie-reject" onClick={() => choose('no')}>Only necessary</button>
        <button type="button" className="cookie-accept" onClick={() => choose('yes')}>Accept</button>
      </div>
    </div>
  )
}
