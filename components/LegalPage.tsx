import type { ReactNode } from 'react'

export const LEGAL_UPDATED = '1 October 2026'
export const LEGAL_NAME = 'Nicolò Allodio'
export const LEGAL_VAT = '04210160133'
export const LEGAL_EMAIL = 'info@cryptodroply.com'

export default function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <h1>{title}</h1>
        <p style={{ color: 'var(--muted)' }}>{intro}</p>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Last updated: {LEGAL_UPDATED}</p>
      </div>
      <div className="prose legal" style={{ margin: '24px 0 96px' }}>{children}</div>
    </div>
  )
}
