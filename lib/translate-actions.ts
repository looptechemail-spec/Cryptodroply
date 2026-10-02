'use server'
import { redirect } from 'next/navigation'
import { requireAdmin } from './admin'
import { translateMissing, translating } from './translate'

/** Avvia la traduzione in secondo piano e torna subito alla pagina. */
export async function startTranslation() {
  await requireAdmin()
  if (translating()) redirect('/admin/translate?msg=Already%20running')
  void translateMissing((m) => console.log('[translate] ' + m)).catch((e) => console.error('translate:', e))
  redirect('/admin/translate?msg=Translation%20started.%20Reload%20in%20a%20minute.')
}
