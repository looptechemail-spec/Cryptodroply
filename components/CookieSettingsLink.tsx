'use client'
export default function CookieSettingsLink() {
  return (
    <button type="button" className="linklike" onClick={() => window.dispatchEvent(new Event('cd-cookie-settings'))}>
      Cookie settings
    </button>
  )
}
