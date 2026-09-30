/** Uso: WIX_API_KEY=... WIX_SITE_ID=... DATABASE_URL=... npm run import:wix */
import { runWixImport } from '../lib/wix-import'

runWixImport().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
