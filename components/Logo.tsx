import Link from 'next/link'

export default function Logo() {
  return (
    <Link href="/" className="logo">
      <svg width="26" height="32" viewBox="0 0 28 34" aria-hidden="true">
        <path d="M14 1C14 1 2 15 2 22a12 12 0 0 0 24 0C26 15 14 1 14 1z" fill="#3c53f4" />
        <circle cx="14" cy="23" r="5" fill="#ffd300" />
      </svg>
      <span>Cryptodroply</span>
    </Link>
  )
}
