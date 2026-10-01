import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'
import { absUrl } from '@/lib/url'
import { HOLD_DAYS } from '@/lib/referral'

/** Segna come pagate tutte le commissioni pagabili di un membro (dopo averlo pagato fuori dal sito). */
export async function POST(req: Request) {
  if (!(await isAdmin())) return new Response('unauthorized', { status: 401 })
  const userId = String((await req.formData()).get('userId') ?? '')
  if (userId) {
    await db.commission.updateMany({
      where: { earnerId: userId, status: 'PENDING', createdAt: { lte: new Date(Date.now() - HOLD_DAYS * 864e5) } },
      data: { status: 'PAID', paidAt: new Date() },
    })
  }
  return NextResponse.redirect(absUrl('/admin/referrals', req), 303)
}
