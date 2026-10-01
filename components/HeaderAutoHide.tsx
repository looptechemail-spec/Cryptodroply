'use client'
import { useEffect } from 'react'

/** Su mobile il menu si nasconde scorrendo verso il basso e ricompare appena si scorre verso l'alto. */
export default function HeaderAutoHide() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!header) return
    let last = window.scrollY
    let ticking = false
    const update = () => {
      ticking = false
      const y = Math.max(window.scrollY, 0)
      const delta = y - last
      if (y < 80 || delta < -6) header.classList.remove('is-hidden')
      else if (delta > 6) header.classList.add('is-hidden')
      if (Math.abs(delta) > 6 || y < 80) last = y
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); header.classList.remove('is-hidden') }
  }, [])
  return null
}
