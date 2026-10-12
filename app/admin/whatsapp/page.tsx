import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { AdminNav } from '@/components/AdminNav'
import { notify, notifyReady } from '@/lib/notify'

export const dynamic = 'force-dynamic'

async function test() {
  'use server'
  await requireAdmin()
  const r = await notify('✅ Prova da Cryptodroply: gli avvisi WhatsApp funzionano.')
  revalidatePath('/admin/whatsapp')
  redirect(`/admin/whatsapp?r=${encodeURIComponent(r === 'ok' ? 'Messaggio inviato: controlla WhatsApp.' : 'Non inviato: ' + r)}`)
}

export default async function Page({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  await requireAdmin()
  const { r } = await searchParams
  const ready = notifyReady()
  return (
    <main className="container" style={{ padding: '24px 0' }}>
      <AdminNav />
      <h1>Avvisi WhatsApp</h1>
      <p>Stato: <b>{ready ? 'configurato' : 'non configurato'}</b>{ready ? '' : ' (aggiungi CALLMEBOT_PHONE e CALLMEBOT_APIKEY su Railway)'}.</p>
      {r && <p style={{ background: '#fff', padding: 12, borderRadius: 12 }}>{r}</p>}
      <form action={test}><button className="btn btn-primary" type="submit">Invia messaggio di prova</button></form>
      <h2 style={{ marginTop: 24 }}>Quando ti scrivo</h2>
      <ul>
        <li>Bozza di un articolo o analisi PRO pronta</li>
        <li>Programma social della settimana pronto</li>
        <li>Bozza della newsletter pronta</li>
        <li>Modulo dal sito (contatto, progetto, collaborazione)</li>
        <li>Nuovo abbonato PRO o pagamento fallito</li>
        <li>Un lavoro automatico che dà errore</li>
        <li>Messaggi dall’esterno (email, ecc.) tramite l’indirizzo /api/notify con la chiave NOTIFY_TOKEN</li>
      </ul>
    </main>
  )
}
