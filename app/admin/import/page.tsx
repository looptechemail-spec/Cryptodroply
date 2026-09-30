'use client'
import { useState } from 'react'

export default function ImportPage() {
  const [password, setPassword] = useState('')
  const [log, setLog] = useState('')
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    setLog('')
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.body) throw new Error('Nessuna risposta')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        setLog((l) => l + dec.decode(value))
      }
    } catch (e) {
      setLog((l) => l + '\nErrore: ' + (e instanceof Error ? e.message : String(e)))
    }
    setRunning(false)
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>Importa da Wix</h1>
        <p style={{ color: 'var(--muted)' }}>Copia strumenti, video e articoli dal vecchio sito. Si può rilanciare senza creare duplicati.</p>
      </div>
      <div style={{ display: 'flex', gap: 12, margin: '24px 0' }}>
        <input
          type="password"
          placeholder="Password admin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 20, border: '1px solid var(--line)' }}
        />
        <button className="btn btn-yellow" onClick={run} disabled={running || !password}>
          {running ? 'Import in corso...' : 'Importa da Wix'}
        </button>
      </div>
      <pre style={{ background: 'var(--tint)', padding: 16, borderRadius: 20, minHeight: 160, whiteSpace: 'pre-wrap' }}>{log || 'Il risultato apparirà qui.'}</pre>
    </div>
  )
}
