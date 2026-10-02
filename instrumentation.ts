export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { applyCatalogTweaks } = await import('./lib/tweaks')
    await applyCatalogTweaks((m) => console.log(m)).catch((e) => console.error('tweaks:', e))
    // Articoli ancora senza copertina copiata (primo import): si importano di nuovo in secondo piano, con testo formattato e immagini.
    // ogni 5 minuti: pubblica su Telegram i post approvati la cui ora è arrivata
    setInterval(() => {
      import('./lib/social-publisher').then((m) => m.publishDueTelegram((x) => console.log('[social] ' + x))).catch((e) => console.error('social:', e))
    }, 5 * 60 * 1000)
    // ogni ora: sequenza di benvenuto e riepilogo referral mensile (partono solo con le email configurate)
    setInterval(() => {
      import('./lib/sequence').then((m) => m.tickSequence((x) => console.log('[seq] ' + x))).catch((e) => console.error('seq:', e))
      import('./lib/referral-mail').then((m) => m.tickReferralMail((x) => console.log('[ref] ' + x))).catch((e) => console.error('ref:', e))
    }, 60 * 60 * 1000)
    // ogni ora: automazioni di contenuto (solo se AUTOMATION_ENABLED=true), sempre in bozza
    setInterval(() => {
      import('./lib/ai-content').then((m) => m.tickAutomation((x) => console.log('[auto] ' + x))).catch((e) => console.error('auto:', e))
    }, 60 * 60 * 1000)
    // traduzione italiana di strumenti e articoli: dopo l'avvio traduce tutto ciò che manca, poi ogni ora i contenuti nuovi
    setTimeout(() => {
      import('./lib/translate').then((m) => m.translateMissing((x) => console.log('[translate] ' + x))).catch((e) => console.error('translate:', e))
    }, 90 * 1000)
    setInterval(() => {
      import('./lib/translate').then((m) => m.translateMissing((x) => console.log('[translate] ' + x), 20)).catch((e) => console.error('translate:', e))
    }, 60 * 60 * 1000)
    // lancio: si tolgono le bozze SEO automatiche (una volta sola) e si copiano sul sito le immagini rimaste su Wix
    void (async () => {
      try {
        const m = await import('./lib/launch')
        await m.clearSeoDraftsOnce((x) => console.log('[launch] ' + x))
        await m.mirrorWixImages((x) => console.log('[launch] ' + x))
      } catch (e) {
        console.error('launch:', e)
      }
    })()
    void (async () => {
      try {
        const { db } = await import('./lib/db')
        const old = await db.post.count({ where: { coverUrl: { not: null }, NOT: { coverUrl: { startsWith: '/media/' } } } })
        if (!old || !process.env.WIX_API_KEY) return
        console.log(`Blog: ${old} articoli da aggiornare, parte la sincronizzazione da Wix`)
        const { runBlogSync } = await import('./lib/wix-import')
        await runBlogSync((m) => console.log('[blog] ' + m))
        console.log('Blog: sincronizzazione completata')
      } catch (e) {
        console.error('Blog sync:', e)
      }
    })()
  }
}
