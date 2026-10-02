import NextLink from 'next/link'
import type { ComponentProps } from 'react'
import { getLang, lp } from '@/lib/i18n'

/** Come next/link, ma nelle pagine italiane aggiunge /it all'indirizzo. */
export default async function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const lang = await getLang()
  return <NextLink href={typeof href === 'string' ? lp(href, lang) : href} {...rest} />
}
