export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { applyCatalogTweaks } = await import('./lib/tweaks')
    await applyCatalogTweaks((m) => console.log(m)).catch((e) => console.error('tweaks:', e))
  }
}
