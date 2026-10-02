'use client'
import { useEffect, useState } from 'react'

/** Menu mobile: pulsante hamburger, voci con sottomenu che si aprono al tocco, e nascondimento dell'intestazione scorrendo in basso. */
export default function MobileNav({ openLabel = 'Open menu', closeLabel = 'Close menu' }: { openLabel?: string; closeLabel?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!header) return
    header.classList.toggle('nav-open', open)
    if (open) header.classList.remove('is-hidden')
  }, [open])

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!header) return
    const mobile = () => window.matchMedia('(max-width: 900px)').matches

    // tocco sulle voci con sottomenu: apre/chiude il sottomenu invece di cambiare pagina
    const onClick = (e: Event) => {
      if (!mobile()) return
      const t = e.target as HTMLElement
      const link = t.closest<HTMLElement>('.nav-link')
      const item = link?.closest<HTMLElement>('.nav-item')
      if (link && item && item.querySelector('.menu')) {
        e.preventDefault()
        const wasOpen = item.classList.contains('open')
        header.querySelectorAll('.nav-item.open').forEach((x) => x.classList.remove('open'))
        if (!wasOpen) item.classList.add('open')
        return
      }
      if (t.closest('a')) setOpen(false) // un vero link: chiude il menu
    }
    header.addEventListener('click', onClick)

    let last = window.scrollY
    let ticking = false
    const update = () => {
      ticking = false
      if (header.classList.contains('nav-open')) { last = window.scrollY; return }
      const y = Math.max(window.scrollY, 0)
      const delta = y - last
      if (y < 80 || delta < -6) header.classList.remove('is-hidden')
      else if (delta > 6) header.classList.add('is-hidden')
      if (Math.abs(delta) > 6 || y < 80) last = y
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      header.removeEventListener('click', onClick)
      window.removeEventListener('scroll', onScroll)
      header.classList.remove('is-hidden', 'nav-open')
    }
  }, [])

  return (
    <button type="button" className="burger" aria-label={open ? closeLabel : openLabel} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
      <span /><span /><span />
    </button>
  )
}
