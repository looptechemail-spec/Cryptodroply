import { redirect } from 'next/navigation'
import { timingSafeEqual } from 'node:crypto'
import { isAdmin } from './auth'

export function adminPasswordOk(raw: string): boolean {
  const given = raw.trim()
  const expected = (process.env.ADMIN_PASSWORD ?? '').trim()
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Nelle pagine admin: se non si è collegati si va alla schermata di accesso. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login')
}

/** Chiave per le chiamate di n8n alle API del sito: intestazione "Authorization: Bearer <chiave>". */
export function apiKeyOk(req: Request): boolean {
  const expected = process.env.N8N_API_KEY ?? ''
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
