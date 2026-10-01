'use client'
import { useState } from 'react'
import Link from 'next/link'
import ToolExplorer from './ToolExplorer'
import type { Facet } from '@/lib/tags'
import type { AppTool } from '@/lib/content'

export type Group = { slug: string; name: string; blurb: string; intro: string; count: number; tools: AppTool[]; facets: Facet[] }

export default function CategoryAccordion({ groups, pro }: { groups: Group[]; pro: boolean }) {
  const [open, setOpen] = useState<string | null>(groups[0]?.slug ?? null)
  return (
    <div className="acc">
      <div className="acc-tabs" role="tablist">
        {groups.map((g) => {
          const on = open === g.slug
          return (
            <button
              key={g.slug}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${g.slug}`}
              className={`acc-tab ${on ? 'on' : ''}`}
              onClick={() => setOpen(on ? null : g.slug)}
            >
              <span className="acc-top">
                <b>{g.name}</b>
                <span className="acc-count">{g.count}</span>
              </span>
              <span className="acc-blurb">{g.blurb}</span>
            </button>
          )
        })}
      </div>
      {groups.map((g) => (
        <div key={g.slug} id={`panel-${g.slug}`} role="tabpanel" hidden={open !== g.slug} className="acc-panel">
          <div className="row-head">
            <h2 style={{ fontSize: 26 }}>{g.name}</h2>
            <Link href={`/${g.slug}`}>Open page</Link>
          </div>
          {g.intro && <p className="panel-intro">{g.intro}</p>}
          <ToolExplorer tools={g.tools} facets={g.facets} pro={pro} />
        </div>
      ))}
    </div>
  )
}
