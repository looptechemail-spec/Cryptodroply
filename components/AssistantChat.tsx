'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type Msg = { role: 'user' | 'assistant'; content: string }

const T = {
  en: {
    open: 'Ask the crypto assistant', title: 'Crypto assistant', hello: 'Hi! Ask me anything about crypto, wallets, exchanges, airdrops or the guides on Cryptodroply.',
    ph: 'Write your question…', send: 'Send', close: 'Close', wait: 'Thinking…', note: 'Educational information, not financial advice.',
    err: 'Something went wrong. Please try again in a moment.', off: 'The assistant is not available right now.', limit: 'You have used all your messages for today.',
    limitAnon: 'You have used your free messages for today. Create a free account for more.', limitFree: 'You have used your free messages for today. PRO members get many more.',
    signup: 'Create a free account', pro: 'Get PRO', sug: ['I am new, where do I start?', 'What is a cold wallet?', 'How do I spot a crypto scam?'],
  },
  it: {
    open: 'Chiedi all’assistente crypto', title: 'Assistente crypto', hello: 'Ciao! Chiedimi qualsiasi cosa su crypto, wallet, exchange, airdrop o sulle guide di Cryptodroply.',
    ph: 'Scrivi la tua domanda…', send: 'Invia', close: 'Chiudi', wait: 'Sto pensando…', note: 'Informazioni educative, non consulenza finanziaria.',
    err: 'Qualcosa non ha funzionato. Riprova tra un attimo.', off: 'L’assistente non è disponibile al momento.', limit: 'Hai finito i messaggi di oggi.',
    limitAnon: 'Hai finito i messaggi gratuiti di oggi. Crea un account gratuito per averne di più.', limitFree: 'Hai finito i messaggi gratuiti di oggi. Chi ha PRO ne ha molti di più.',
    signup: 'Crea un account gratuito', pro: 'Passa a PRO', sug: ['Sono nuovo, da dove parto?', 'Cos’è un cold wallet?', 'Come riconosco una truffa crypto?'],
  },
} as const

/** Testo semplice con **grassetto** e [link](https://…), senza HTML: nessun rischio di codice iniettato. */
function Rich({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <p key={i} style={{ margin: line.trim() ? '0 0 8px' : 0 }}>
          {line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g).map((part, j) => {
            const b = part.match(/^\*\*([^*]+)\*\*$/)
            if (b) return <strong key={j}>{b[1]}</strong>
            const l = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
            if (l) return <a key={j} href={l[2]} style={{ color: '#3C53F4', fontWeight: 700 }}>{l[1]}</a>
            return <span key={j}>{part}</span>
          })}
        </p>
      ))}
    </>
  )
}

export default function AssistantChat({ lang }: { lang: 'en' | 'it' }) {
  const t = T[lang]
  const path = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'err' | 'limit'; tier?: string; text: string } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { const s = sessionStorage.getItem('cd_chat'); if (s) setMsgs(JSON.parse(s)) } catch { /* nessun salvataggio */ }
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem('cd_chat', JSON.stringify(msgs.slice(-20))) } catch { /* nessun salvataggio */ }
    box.current?.scrollTo({ top: box.current.scrollHeight })
  }, [msgs, busy, open])

  if (/^\/(it\/)?admin(\/|$)/.test(path)) return null
  const prefix = lang === 'it' ? '/it' : ''

  async function send(q: string) {
    const content = q.trim()
    if (!content || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content }]
    setMsgs(next); setText(''); setBusy(true); setNotice(null)
    try {
      const res = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.slice(-10), lang }) })
      const j = await res.json().catch(() => ({}))
      if (res.status === 429) setNotice({ kind: 'limit', tier: j.tier, text: j.tier === 'anon' ? t.limitAnon : j.tier === 'free' ? t.limitFree : t.limit })
      else if (!res.ok) setNotice({ kind: 'err', text: j.error === 'off' ? t.off : t.err })
      else setMsgs([...next, { role: 'assistant', content: String(j.reply ?? '') }])
    } catch { setNotice({ kind: 'err', text: t.err }) }
    setBusy(false)
  }

  const brand = '#3C53F4'
  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label={t.open}
          style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 60, background: brand, color: '#fff', border: 0, borderRadius: 999, padding: '14px 20px', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(60,83,244,.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true" style={{ background: '#FFD300', color: '#000', borderRadius: 999, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>?</span>
          {t.open}
        </button>
      )}
      {open && (
        <div role="dialog" aria-label={t.title}
          style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 60, width: 'min(390px, calc(100vw - 24px))', height: 'min(580px, calc(100vh - 24px))', background: '#fff', borderRadius: 20, boxShadow: '0 16px 48px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#1a1a1a' }}>
          <div style={{ background: brand, color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong>{t.title}</strong>
            <button onClick={() => setOpen(false)} aria-label={t.close} style={{ background: 'transparent', color: '#fff', border: 0, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div ref={box} style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#f6f7fb', fontSize: 14.5, lineHeight: 1.5 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '10px 12px', marginBottom: 10 }}>{t.hello}</div>
            {msgs.length === 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {t.sug.map((s) => <button key={s} onClick={() => send(s)} style={{ border: `1px solid ${brand}`, color: brand, background: '#fff', borderRadius: 999, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>{s}</button>)}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{ maxWidth: '88%', background: m.role === 'user' ? brand : '#fff', color: m.role === 'user' ? '#fff' : '#1a1a1a', borderRadius: 14, padding: '9px 12px', wordBreak: 'break-word' }}>
                  {m.role === 'user' ? m.content : <Rich text={m.content} />}
                </div>
              </div>
            ))}
            {busy && <div style={{ color: '#666', padding: '4px 2px' }}>{t.wait}</div>}
            {notice && (
              <div style={{ background: notice.kind === 'limit' ? '#fff7d1' : '#fde8ea', borderRadius: 14, padding: '10px 12px', marginBottom: 8 }}>
                {notice.text}
                {notice.kind === 'limit' && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {notice.tier === 'anon' && <a href={`${prefix}/signup`} style={{ background: brand, color: '#fff', padding: '8px 14px', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}>{t.signup}</a>}
                    <a href={`${prefix}/pricing`} style={{ background: '#FFD300', color: '#000', padding: '8px 14px', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}>{t.pro}</a>
                  </div>
                )}
              </div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(text) }} style={{ padding: 10, borderTop: '1px solid #eee', background: '#fff' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={800} placeholder={t.ph} aria-label={t.ph}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid #d8dbe6', fontSize: 15, minWidth: 0 }} />
              <button disabled={busy || !text.trim()} style={{ background: brand, color: '#fff', border: 0, borderRadius: 12, padding: '0 16px', fontWeight: 700, cursor: 'pointer', opacity: busy || !text.trim() ? 0.5 : 1 }}>{t.send}</button>
            </div>
            <div style={{ fontSize: 11.5, color: '#777', marginTop: 6 }}>{t.note}</div>
          </form>
        </div>
      )}
    </>
  )
}
