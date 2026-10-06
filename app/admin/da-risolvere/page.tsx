import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { auditToolLinks } from '@/lib/link-audit'

export const dynamic = 'force-dynamic'

type Item = { id: string; group: string; title: string; how: string; href?: string; cta?: string }

/** Cose che solo tu puoi sistemare. Si spuntano da qui e la scelta resta salvata. */
const ITEMS: Item[] = [
  { id: 'hyperplay', group: 'Link degli strumenti da correggere', title: 'HyperPlay porta al sito sbagliato', how: 'Il link porta a coinfello.com, che è un altro prodotto. Il sito ufficiale è https://www.hyperplay.xyz. Se non è un link di affiliazione voluto, sostituiscilo.', href: '/admin/tools?q=HyperPlay', cta: 'Apri la scheda' },
  { id: 'kraken', group: 'Link degli strumenti da correggere', title: 'Kraken (MiCA): il link di invito dà errore 404', how: 'Il link invite.kraken.com/JDNW/eu9nsrlc non risponde. Controlla in Kraken che il tuo link di invito sia ancora valido e sostituiscilo.', href: '/admin/tools?q=Kraken', cta: 'Apri la scheda' },
  { id: 'questn', group: 'Link degli strumenti da correggere', title: 'QuestN: certificato del sito scaduto', how: 'app.questn.com ha il certificato scaduto. Il problema è del loro sito: controlla se hanno cambiato indirizzo e aggiorna il link.', href: '/admin/tools?q=QuestN', cta: 'Apri la scheda' },
  { id: 'eigencloud', group: 'Link degli strumenti da correggere', title: 'EigenCloud: app.eigenlayer.xyz dà errore 500', how: 'Può essere un problema temporaneo. Riaprilo tra qualche giorno; se ancora non va, cerca il nuovo indirizzo (il progetto ha cambiato nome).', href: '/admin/tools?q=EigenCloud', cta: 'Apri la scheda' },
  { id: 'joinmarket', group: 'Link degli strumenti da correggere', title: 'JoinMarket: il sito non risponde ai controlli', how: 'Da qui joinmarket.net non risulta raggiungibile, ma il sito esiste. Aprilo tu: se funziona, lascia com’è.', href: '/admin/tools?q=JoinMarket', cta: 'Apri la scheda' },
  { id: 'wemix', group: 'Link degli strumenti da correggere', title: 'WEMIX Play: controlla il link nuovo', how: 'Ho messo https://wemixplay.com/ e tolto il video YouTube dal link di affiliazione. Apri la scheda sul sito e controlla che il pulsante porti al posto giusto. Se hai un link di affiliazione vero, inseriscilo.', href: '/admin/tools?q=WEMIX', cta: 'Apri la scheda' },
  { id: 'nolink', group: 'Schede senza nessun link', title: 'Binance, Binance Grid Bot, OKX Signal Bot, DEX Wallet, CEX Exchange', how: 'Queste schede non hanno né link di affiliazione né sito. Aggiungi il link, oppure, per DEX Wallet e CEX Exchange che sembrano schede generiche, decidi se tenerle.', href: '/admin/tools?q=Binance', cta: 'Apri gli strumenti' },
  { id: 'manual-links', group: 'Link da aprire a mano', title: 'Siti che bloccano i controlli automatici', how: 'Apri uno per uno e controlla che funzionino: 3Commas, Layer3, DexScreener, Zapper, Messari, The Sandbox, Crypto.com, Ether.fi, Faucet Crypto, Token Sniffer, Glassnode.', href: '/admin/tools', cta: 'Apri gli strumenti' },
  { id: 'kite', group: 'Contenuti', title: 'Analisi di Kite: scegli la bozza e rileggi i dati', how: 'Ci sono 3 bozze quasi uguali. Tieni la migliore ed elimina le altre. Aggiungi la copertina e rileggi prezzi, supply e date prima di pubblicare, perché l’IA può sbagliare.', href: '/admin/articles', cta: 'Apri gli articoli' },
  { id: 'legacy-import', group: 'Contenuti', title: 'Importa i vecchi contatti di Wix', how: 'Premi il pulsante di importazione. Finché non lo fai la tabella resta vuota. Dopo l’importazione, invia prima un’email di prova a te stesso.', href: '/admin/legacy', cta: 'Apri Vecchi contatti' },
  { id: 'airdrop-order', group: 'Contenuti', title: 'Airdrop: controlla l’ordine', how: 'AirdropAlert e Airdrops.io sono stati messi per primi. Apri la sezione Airdrop e controlla che l’ordine sia quello che volevi.', href: '/s/free-earn', cta: 'Apri la sezione' },
  { id: 'admin-it', group: 'Contenuti', title: 'Controlla i testi italiani dell’admin', how: 'Ho tradotto l’admin in italiano senza poterlo aprire online. Se vedi un testo rimasto in inglese o una frase strana, segnalamelo.' },
]

async function toggle(id: string) {
  'use server'
  await requireAdmin()
  const key = `fix-todo:${id}`
  const done = await db.jobRun.findUnique({ where: { key } })
  if (done) await db.jobRun.delete({ where: { key } })
  else await db.jobRun.create({ data: { key, note: 'done' } })
  revalidatePath('/admin/da-risolvere')
}

async function recheck() {
  'use server'
  await requireAdmin()
  const key = 'link-audit:running'
  await db.jobRun.upsert({ where: { key }, update: { note: 'in corso', ranAt: new Date() }, create: { key, note: 'in corso' } })
  void auditToolLinks((m) => console.log('[links] ' + m)).catch((e) => console.error('links:', e)).finally(() => { void db.jobRun.delete({ where: { key } }).catch(() => undefined) })
  revalidatePath('/admin/da-risolvere')
  redirect('/admin/da-risolvere?r=' + encodeURIComponent('Controllo avviato: ci vogliono circa 2 minuti. Ricarica la pagina per vedere il risultato.'))
}

export default async function AdminFix({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await requireAdmin()
  const { r } = await searchParams
  const [doneRows, audit, running] = await Promise.all([
    db.jobRun.findMany({ where: { key: { startsWith: 'fix-todo:' } }, select: { key: true } }),
    db.jobRun.findUnique({ where: { key: 'link-audit:last' } }),
    db.jobRun.findUnique({ where: { key: 'link-audit:running' } }),
  ])
  const done = new Set(doneRows.map((x) => x.key.slice('fix-todo:'.length)))
  const open = ITEMS.filter((x) => !done.has(x.id))
  const groups = [...new Set(ITEMS.map((x) => x.group))]
  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <h1>Da risolvere ({open.length} rimaste)</h1>
      <AdminNav />
      {r && <p role="status" style={{ padding: '12px 16px', borderRadius: 12, fontWeight: 700, background: '#e6f6ea', color: '#145a2a' }}>{r}</p>}
      <p>Le cose che solo tu puoi sistemare. Spunta una voce quando è fatta: la lista viene salvata.</p>
      {groups.map((g) => (
        <section key={g} style={{ marginTop: 24 }}>
          <h2>{g}</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {ITEMS.filter((x) => x.group === g).map((x) => {
              const isDone = done.has(x.id)
              return (
                <form key={x.id} action={toggle.bind(null, x.id)} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--shadow-1)', display: 'flex', gap: 14, alignItems: 'flex-start', opacity: isDone ? 0.55 : 1 }}>
                  <button aria-label={isDone ? 'Segna come da fare' : 'Segna come fatto'} style={{ fontSize: 22, lineHeight: 1, background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>{isDone ? '☑️' : '⬜'}</button>
                  <div>
                    <b style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{x.title}</b>
                    <div style={{ marginTop: 4 }}>{x.how}</div>
                    {x.href && <div style={{ marginTop: 6 }}><Link href={x.href}>{x.cta ?? 'Apri'} →</Link></div>}
                  </div>
                </form>
              )
            })}
          </div>
        </section>
      ))}

      <section style={{ marginTop: 32 }}>
        <h2>Controllo dei link degli strumenti</h2>
        <p>Controlla uno per uno i link dei pulsanti degli strumenti e segnala quelli che non rispondono, che portano a un video o a un sito che non somiglia al nome.</p>
        <form action={recheck}><button className="btn btn-blue" type="submit" disabled={!!running}>{running ? 'Controllo in corso…' : 'Ricontrolla i link ora'}</button></form>
        {audit ? (
          <>
            <p><small>Ultimo controllo: {audit.ranAt.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}</small></p>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-1)', fontSize: 13 }}>{audit.note}</pre>
          </>
        ) : <p><small>Nessun controllo salvato ancora: parte da solo poco dopo ogni avvio del sito, oppure premi il pulsante.</small></p>}
      </section>
    </div>
  )
}
