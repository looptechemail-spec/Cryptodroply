/**
 * Collegamento a Publer (programmazione social). Serve PUBLER_API_KEY (variabile Railway) con i permessi
 * workspaces, accounts, posts. Facoltative: PUBLER_WORKSPACE_ID, PUBLER_ACCOUNT_IDS ("twitter:ID,facebook:ID,telegram:ID").
 */
const BASE = 'https://app.publer.com/api/v1'
const PROVIDER: Record<string, string> = { telegram: 'telegram', x: 'twitter', facebook: 'facebook' }

function key() {
  const k = process.env.PUBLER_API_KEY
  if (!k) throw new Error('PUBLER_API_KEY mancante su Railway')
  return k
}

async function call(path: string, init: RequestInit & { workspace?: string } = {}) {
  const headers: Record<string, string> = { Authorization: `Bearer-API ${key()}`, Accept: 'application/json', 'Content-Type': 'application/json' }
  if (init.workspace) headers['Publer-Workspace-Id'] = init.workspace
  const res = await fetch(`${BASE}${path}`, { method: init.method, body: init.body, headers })
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { /* non JSON */ }
  if (!res.ok) throw new Error(`Publer ${res.status} ${path}: ${text.slice(0, 300)}`)
  return json
}

let wsCache: string | null = null
export async function workspaceId(): Promise<string> {
  if (process.env.PUBLER_WORKSPACE_ID) return process.env.PUBLER_WORKSPACE_ID
  if (wsCache) return wsCache
  const list = await call('/workspaces')
  const arr = Array.isArray(list) ? list : list?.workspaces ?? []
  if (!arr.length) throw new Error('Nessun workspace trovato su Publer')
  wsCache = String(arr[0].id)
  return wsCache
}

export type PublerAccount = { id: string; provider: string; name: string; type?: string }
let accCache: { at: number; list: PublerAccount[] } | null = null
export async function listAccounts(): Promise<PublerAccount[]> {
  if (accCache && Date.now() - accCache.at < 60000) return accCache.list
  const ws = await workspaceId()
  const list = await call('/accounts', { workspace: ws })
  const arr: PublerAccount[] = Array.isArray(list) ? list : list?.accounts ?? []
  accCache = { at: Date.now(), list: arr }
  return arr
}

async function accountFor(channel: string, accounts: PublerAccount[]): Promise<PublerAccount> {
  const provider = PROVIDER[channel]
  if (!provider) throw new Error(`Canale non supportato: ${channel}`)
  const forced = (process.env.PUBLER_ACCOUNT_IDS ?? '').split(',').map((s) => s.trim().split(':')).find(([p]) => p === provider)?.[1]
  if (forced) return { id: forced, provider, name: forced }
  const found = accounts.filter((a) => a.provider === provider)
  if (found.length === 1) return found[0]
  if (!found.length) throw new Error(`Nessun account ${provider} collegato a Publer`)
  throw new Error(`Più account ${provider} su Publer (${found.map((a) => `${a.name}=${a.id}`).join(', ')}). Imposta PUBLER_ACCOUNT_IDS su Railway, es. ${provider}:${found[0].id}`)
}

/** Invia un post a Publer come bozza datata ("draft") o programmato ("scheduled"). Ritorna l'id del lavoro. */
export async function sendToPubler(p: { channel: string; text: string; linkUrl?: string | null; scheduledAt?: Date | null }, state: 'draft' | 'scheduled'): Promise<string> {
  const ws = await workspaceId()
  const accounts = await listAccounts()
  const acc = await accountFor(p.channel, accounts)
  const provider = PROVIDER[p.channel]
  const text = p.linkUrl && !p.text.includes(p.linkUrl) ? `${p.text}\n\n${p.linkUrl}` : p.text
  if (state === 'scheduled') {
    if (!p.scheduledAt) throw new Error('Per programmare serve data e ora')
    if (p.scheduledAt.getTime() < Date.now() + 2 * 60000) throw new Error('L\'orario deve essere almeno 2 minuti nel futuro')
  }
  const body = {
    bulk: {
      state,
      posts: [{
        networks: { [provider]: { type: 'status', text } },
        accounts: [{ id: acc.id, ...(p.scheduledAt ? { scheduled_at: p.scheduledAt.toISOString() } : {}) }],
      }],
    },
  }
  const r = await call('/posts/schedule', { method: 'POST', workspace: ws, body: JSON.stringify(body) })
  const job = r?.job_id ?? r?.id
  if (!job) throw new Error('Publer non ha restituito un id: ' + JSON.stringify(r).slice(0, 200))
  return String(job)
}

export async function jobStatus(job: string): Promise<string> {
  const ws = await workspaceId()
  const r = await call(`/job_status/${job}`, { workspace: ws })
  return JSON.stringify(r).slice(0, 400)
}
