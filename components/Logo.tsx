import Link from './LocLink'

export default function Logo() {
  return (
    <Link href="/" className="logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={30} height={36} />
      <span>Cryptodroply</span>
    </Link>
  )
}
