'use server'
import { redirect } from 'next/navigation'
import { requireAdmin } from './admin'
import { translateMissing, translating } from './translate'

/** Avvia la traduzione in secondo piano e torna subito alla pagina. */
export async function startTranslation() {
  await requireAdmin()
  if (translating()) redirect('/admin/translate?msg=Gi%C3%A0%20in%20corso')
  void translateMissing((m) => console.log('[translate] ' + m)).catch((e) => console.error('translate:', e))
  redirect('/admin/translate?msg=Traduzione%20avviata.%20Ricarica%20tra%20un%20minuto.')
}
