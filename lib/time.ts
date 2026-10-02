/** Ora di Roma <-> Date (UTC). I moduli dell'admin e le programmazioni usano sempre l'ora di Roma. */
const ROME = 'Europe/Rome'

function offsetMin(d: Date): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: ROME, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d).map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second)
  return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000)
}

/** "2026-10-03T12:00" scritto in ora di Roma -> Date corretta. */
export function romeToDate(local: string): Date {
  const asUtc = new Date(local.length === 16 ? `${local}:00Z` : `${local}Z`)
  return new Date(asUtc.getTime() - offsetMin(asUtc) * 60000)
}

/** Date -> "YYYY-MM-DDTHH:mm" in ora di Roma, per i campi datetime-local. */
export function dateToRome(d?: Date | null): string {
  if (!d) return ''
  return new Date(d.getTime() + offsetMin(d) * 60000).toISOString().slice(0, 16)
}

/** Domani alle HH:mm, ora di Roma. */
export function tomorrowRome(hour = 12, minute = 0): Date {
  const t = new Date(Date.now() + offsetMin(new Date()) * 60000 + 86400000).toISOString().slice(0, 10)
  return romeToDate(`${t}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
}
