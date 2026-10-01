import { randomBytes } from 'node:crypto'
import { db } from './db'

export const COMMISSION_RATE = 0.3 // 30% di ogni pagamento del referral
export const RECURRING = true // true: su ogni mensilità pagata; false: solo sul primo pagamento
export const HOLD_DAYS = 30 // giorni di garanzia prima che la commissione sia pagabile (rimborsi)
export const MIN_PAYOUT_CENTS = 2000 // pagamento minimo: 20 €
export const REF_COOKIE = 'cd_ref'

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const makeCode = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('')

/** Ogni utente ha un codice personale: si crea la prima volta che serve. */
export async function ensureReferralCode(userId: string, current?: string | null): Promise<string> {
  if (current) return current
  for (let i = 0; i < 5; i++) {
    const code = makeCode()
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } })
      return code
    } catch {
      /* codice già usato: si riprova */
    }
  }
  throw new Error('impossibile creare il codice referral')
}

export const euro = (cents: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(cents / 100)

export async function earnings(userId: string) {
  const rows = await db.commission.findMany({ where: { earnerId: userId }, orderBy: { createdAt: 'desc' } })
  const releaseAt = Date.now() - HOLD_DAYS * 864e5
  let pending = 0, available = 0, paid = 0
  for (const c of rows) {
    if (c.status === 'PAID') paid += c.amountCents
    else if (c.status === 'PENDING') (c.createdAt.getTime() <= releaseAt ? (available += c.amountCents) : (pending += c.amountCents))
  }
  return { rows, pending, available, paid }
}
