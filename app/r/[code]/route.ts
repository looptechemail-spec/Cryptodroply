import { NextResponse } from 'next/server'
import { absUrl } from '@/lib/url'

/** Link personale breve: cryptodroply.com/r/CODICE */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  // il cookie cd_ref si salva solo dopo il consenso (banner + middleware)
  const res = NextResponse.redirect(absUrl(`/?ref=${encodeURIComponent(code.toLowerCase())}`, req), 302)
  return res
}
