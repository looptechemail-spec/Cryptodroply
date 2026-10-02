'use client'
export default function CookieSettingsLink({ label = 'Cookie settings' }: { label?: string }) {
  return (
    <button type="button" className="linklike" onClick={() => window.dispatchEvent(new Event('cd-cookie-settings'))}>
      {label}
    </button>
  )
}
