import { NextResponse } from 'next/server'
import { apiKeyOk } from './admin'
export const unauthorized = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 })
export const guard = (req: Request) => apiKeyOk(req)
export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
