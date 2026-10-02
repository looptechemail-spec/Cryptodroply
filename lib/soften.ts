/**
 * Riscrive i testi inglesi delle schede della sezione Privacy in tono informativo e neutro:
 * spiegano come funziona lo strumento e come proteggere i propri dati, senza incoraggiare a evitare controlli, imposte o autorità.
 * Una volta per scheda (l'originale resta salvato nel registro, per tornare indietro), poi si rifà la traduzione italiana.
 */
import { db } from './db'
import { SECTIONS } from './sections'

const MODEL = () => process.env.AI_MODEL_ARTICLE ?? 'claude-sonnet-5-5'
const PRIVACY = () => SECTIONS.find((s) => s.key === 'privacy')!.collections
const FIELDS = ['description', 'fullDescription', 'whatIs', 'howItWorks', 'whenToUse', 'tip'] as const

const SYSTEM = `You edit the texts of a crypto tools directory (Cryptodroply) for the Privacy section. The goal is educational, neutral and law-abiding content.
Rewrite each block in English following these rules:
- Keep every true fact: what the tool is, how it works technically, platforms, fees, limits, requirements, and which checks (identity verification, KYC) it applies or does not apply, stated plainly and neutrally as a feature, never as a selling point.
- Frame the value as protecting personal data, limiting what is shared and understanding how privacy works on public blockchains.
- Remove or rephrase anything that suggests avoiding authorities, taxes, regulation, law enforcement, identity checks, freezes or seizures, or that calls the tool anonymous, untraceable or censorship-proof. Remove claims such as "no one can block you", "no data to authorities", "stay under the radar".
- Where it fits, add one short sentence that rules differ by country and the reader must follow the laws of their country and the rules of the platform.
- No promises, no hype, no financial advice, no long dashes. Do not add information that is not in the original.
- Keep the same HTML tags, attributes and class names, the same list structure and about the same length.
Answer ONLY with the same blocks, same names, in this format: <f name="field_name">text</f>`

async function ask(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY mancante')
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL(), max_tokens: 6000, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
    })
    if (res.ok) {
      const j = await res.json()
      return (j.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    }
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 4000 * (attempt + 1))); continue }
    throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  }
  throw new Error('Anthropic non risponde')
}

export async function softenPrivacyTools(log: (m: string) => void = () => {}): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) return 0
  const tools = await db.tool.findMany({
    where: { category: { wixId: { in: PRIVACY() } }, translations: { some: { locale: 'EN' } } },
    include: { translations: { where: { locale: 'EN' } } },
  })
  const done = new Set((await db.jobRun.findMany({ where: { key: { startsWith: 'soften-privacy-1:' } }, select: { key: true } })).map((r) => r.key))
  const todo = tools.filter((t) => !done.has(`soften-privacy-1:${t.id}`))
  log(`schede Privacy da riscrivere: ${todo.length}`)
  let n = 0
  for (const tool of todo) {
    const en = tool.translations[0]
    const input = FIELDS.filter((f) => en[f] && en[f]!.trim())
    if (!input.length) continue
    try {
      const out = await ask(input.map((f) => `<f name="${f}">${en[f]}</f>`).join('\n\n'))
      const res: Record<string, string> = {}
      for (const m of out.matchAll(/<f name="(\w+)">([\s\S]*?)<\/f>/g)) if ((input as readonly string[]).includes(m[1]) && m[2].trim()) res[m[1]] = m[2].trim()
      if (!res.description && !res.fullDescription && !res.whatIs) throw new Error('risposta vuota')
      const original: Record<string, string | null> = {}
      for (const f of FIELDS) original[f] = en[f]
      await db.toolTranslation.update({ where: { id: en.id }, data: res })
      await db.toolTranslation.deleteMany({ where: { toolId: tool.id, locale: 'IT' } }) // si rifà in italiano dal testo nuovo
      await db.jobRun.create({ data: { key: `soften-privacy-1:${tool.id}`, note: JSON.stringify(original) } })
      n++
    } catch (e) {
      log(`scheda ${tool.slug}: ${(e as Error).message}`)
    }
  }
  log(`schede Privacy riscritte: ${n}`)
  return n
}
