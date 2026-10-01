export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { applyCatalogTweaks } = await import('./lib/tweaks')
    await applyCatalogTweaks((m) => console.log(m)).catch((e) => console.error('tweaks:', e))
    // Articoli ancora senza copertina copiata (primo import): si importano di nuovo in secondo piano, con testo formattato e immagini.
    // ogni 5 minuti: pubblica su Telegram i post approvati la cui ora è arrivata
    setInterval(() => {
      import('./lib/social-publisher').then((m) => m.publishDueTelegram((x) => console.log('[social] ' + x))).catch((e) => console.error('social:', e))
    }, 5 * 60 * 1000)
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
