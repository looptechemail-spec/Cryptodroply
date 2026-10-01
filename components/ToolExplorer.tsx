'use client'
import { useMemo, useState } from 'react'
import { AppCard } from './AppCard'
import type { AppTool } from '@/lib/content'
import type { Facet } from '@/lib/tags'

/** Griglia di strumenti con ricerca e filtri (si scelgono più opzioni: tra opzioni dello stesso gruppo vale "o", tra gruppi vale "e"). */
export default function ToolExplorer({ tools, facets, pro = false, base }: { tools: AppTool[]; facets: Facet[]; pro?: boolean; base?: string }) {
  const [sel, setSel] = useState<Record<string, string[]>>({})
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const active = Object.values(sel).reduce((n, v) => n + v.length, 0)
  const toggle = (id: string, value: string) =>
    setSel((s) => {
      const cur = s[id] ?? []
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...s, [id]: next }
    })

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return tools.filter((t) => {
      if (needle && !`${t.title} ${t.description ?? ''}`.toLowerCase().includes(needle)) return false
      return Object.entries(sel).every(([id, wanted]) => !wanted.length || wanted.some((w) => t.vals?.[id]?.includes(w)))
    })
  }, [tools, sel, q])

  const bools = facets.filter((f) => f.kind === 'bool')
  const multis = facets.filter((f) => f.kind === 'multi')
  const showBar = facets.length > 0 || tools.length > 8

  const chip = (id: string, value: string, emoji: string, label: string, count: number) => {
    const on = sel[id]?.includes(value)
    return (
      <button key={`${id}:${value}`} type="button" className={`fchip ${on ? 'on' : ''}`} aria-pressed={!!on} onClick={() => toggle(id, value)}>
        <span aria-hidden="true">{emoji}</span> {label} <i>{count}</i>
      </button>
    )
  }

  return (
    <div className="explorer">
      {showBar && (
        <div className="filters">
          <div className="filters-top">
            <input className="filters-search" type="search" placeholder="Search tools" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tools" />
            {facets.length > 0 && (
              <button type="button" className="filters-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                Filters{active ? ` (${active})` : ''}
              </button>
            )}
          </div>
          {facets.length > 0 && (
            <div className={`filters-body ${open ? 'open' : ''}`}>
              {bools.length > 0 && (
                <div className="filter-group">
                  <div className="filter-label">Features</div>
                  <div className="filter-chips">{bools.map((f) => chip(f.id, 'yes', f.emoji, f.label, f.options[0].count))}</div>
                </div>
              )}
              {multis.map((f) => (
                <div key={f.id} className="filter-group">
                  <div className="filter-label">
                    <span aria-hidden="true">{f.emoji}</span> {f.label}
                  </div>
                  <div className="filter-chips">{f.options.map((o) => chip(f.id, o.value, o.emoji, o.label, o.count))}</div>
                </div>
              ))}
            </div>
          )}
          <div className="filters-meta">
            <span>
              {shown.length} of {tools.length} tools
            </span>
            {(active > 0 || q) && (
              <button type="button" className="filters-clear" onClick={() => { setSel({}); setQ('') }}>
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
      {shown.length ? (
        <div className="app-grid">
          {shown.map((t) => (
            <AppCard key={t.id} tool={t} pro={pro} base={base} />
          ))}
        </div>
      ) : (
        <p className="filters-empty">No tool matches these filters. Try removing one.</p>
      )}
    </div>
  )
}
