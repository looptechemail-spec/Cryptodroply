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

/** Prossimo martedì (2) o giovedì (4) alle HH:mm ora di Roma, almeno 30 minuti nel futuro. wd: 1=lun ... 4=gio. */
export function nextWeekdayRome(wd: number, hour = 10, minute = 0): Date {
  for (let add = 0; add < 8; add++) {
    const base = new Date(Date.now() + offsetMin(new Date()) * 60000 + add * 86400000)
    if (((base.getUTCDay() + 6) % 7) !== wd) continue
    const cand = romeToDate(`${base.toISOString().slice(0, 10)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    if (cand.getTime() > Date.now() + 30 * 60000) return cand
  }
  return tomorrowRome(hour, minute)
}

/** Inizio (lunedì 00:00) e fine (lunedì successivo 00:00) di una settimana, ora di Roma. offset: 0 = questa, 1 = prossima. */
export function weekRangeRome(offset = 0): { from: Date; to: Date } {
  const nowRome = new Date(Date.now() + offsetMin(new Date()) * 60000)
  const dow = (nowRome.getUTCDay() + 6) % 7 // 0 = lunedì
  const mon = new Date(Date.UTC(nowRome.getUTCFullYear(), nowRome.getUTCMonth(), nowRome.getUTCDate() - dow + offset * 7))
  const next = new Date(mon.getTime() + 7 * 86400000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { from: romeToDate(`${iso(mon)}T00:00`), to: romeToDate(`${iso(next)}T00:00`) }
}
