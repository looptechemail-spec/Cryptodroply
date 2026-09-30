import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { db } from './db'

export const SESSION_COOKIE = 'cd_session'
export const ADMIN_COOKIE = 'cd_admin'

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET non impostata')
  return s
}
const sign = (v: string) => createHmac('sha256', secret()).update(v).digest('base64url')

/** Token firmato (HMAC) con scadenza. Non contiene dati segreti: solo un id. */
export function signToken(data: Record<string, unknown>, maxAgeSec: number): string {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + maxAgeSec })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function readToken(token?: string | null): (Record<string, any> & { exp: number }) | null {
  if (!token || !process.env.AUTH_SECRET) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    return typeof data.exp === 'number' && data.exp > Date.now() / 1000 ? data : null
  } catch {
    return null
  }
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge,
})

/** L'utente collegato, o null. */
export async function getUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const data = readToken(token)
  if (!data?.uid) return null
  return db.user.findUnique({ where: { id: data.uid }, include: { subscription: true } })
}

export async function isAdmin(): Promise<boolean> {
  const data = readToken((await cookies()).get(ADMIN_COOKIE)?.value)
  return !!data?.admin
}
