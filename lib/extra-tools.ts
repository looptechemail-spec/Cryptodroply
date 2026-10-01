/**
 * Strumenti aggiunti a mano (fuori da Wix). Si creano all'avvio del sito se mancano e non si toccano più:
 * le modifiche fatte dal pannello admin restano. Per aggiungerne uno, si aggiunge una voce a EXTRA_TOOLS.
 */
import { db } from './db'
import { mirrorImage } from './media'

type Extra = {
  wixId: string // sempre "custom:<slug>": non viene mai toccato dall'import da Wix
  collection: string // categoria (id della collezione Wix, es. "toolsanalysis")
  slug: string
  title: string
  logoSource: string // indirizzo web del logo
  websiteUrl: string
  refLink?: string
  attributes: Record<string, string>
  description: string
  tip: string
  whatIs: string
  howItWorks: string
  whenToUse: string
  fullDescription: string
  videos: { url: string; title: string; credit?: string }[]
}

const EXTRA_TOOLS: Extra[] = [
  {
    wixId: 'custom:gmgn',
    collection: 'toolsanalysis',
    slug: 'gmgn',
    title: 'GMGN',
    logoSource: 'https://www.google.com/s2/favicons?domain=gmgn.ai&sz=256',
    websiteUrl: 'https://gmgn.ai/',
    // chiavi = campi della categoria "analysis": platform = tool type, chain = access, walletType = login, custody = KYC,
    // seedPhrase = real-time data, hardwareintegration = alerts, multisig = API, supportedTokens = pro version,
    // browser1 = token tracker, browser11 = browser
    attributes: {
      platform: '🧠 Smart Money Tracker', chain: '🆓 Free', walletType: 'Optional', custody: 'No',
      seedPhrase: 'Yes', hardwareintegration: 'Yes', multisig: 'Yes', supportedTokens: 'No',
      browser1: 'Yes', browser11: 'Yes', mobile: 'Yes', pc: 'No',
    },
    description: 'Multi-chain meme token terminal that tracks smart money wallets, new launches and token security',
    tip: 'Smart money\nWallet tracker',
    fullDescription:
      'GMGN is an analytics and trading terminal built for meme tokens. It covers Solana, BNB Chain, Ethereum, Base and other networks, and combines new token monitoring, security checks, holder analysis and wallet tracking in one place. It is available on the web, as a mobile app and through Telegram bots. Using it is free, and the platform charges a 1% fee on each trade made through it.',
    whatIs:
      '<p>GMGN is a data terminal for meme tokens. It scans new launches on platforms such as Pump.fun and Raydium, ranks trending tokens every minute and shows who holds each token.</p>' +
      '<p>Its main strength is wallet intelligence. You can follow wallets and KOLs with a track record, see their buys and sells as they happen, and look up the profit and loss of any wallet address. It also runs an automatic security check on every token.</p>',
    howItWorks:
      '<ol>' +
      '<li>Open GMGN on the web, in the app or in Telegram and log in with a wallet or Telegram.</li>' +
      '<li>Browse new and trending tokens and filter them by market cap, volume and age.</li>' +
      '<li>Open a token to read its security checks: liquidity burned, honeypot risk, mint and contract status, top holders, insider and bundled buys.</li>' +
      '<li>Add wallets or KOLs to your watchlist and turn on alerts for every buy, sell and exit.</li>' +
      '<li>Paste any wallet address to see its realized and unrealized profit, win rate and full trade history.</li>' +
      '<li>If you want to trade, GMGN also offers swaps, limit orders, take profit and stop loss, and copy trading of the wallets you follow.</li>' +
      '</ol>',
    whenToUse:
      '<p><strong>Use GMGN when you:</strong></p>' +
      '<ul>' +
      '<li>Look for new meme tokens early and want to filter out the noise</li>' +
      '<li>Want a fast safety check before touching an unknown token</li>' +
      '<li>Follow smart money wallets and want to know what they buy</li>' +
      '<li>Want to judge how good a wallet really is before copying it</li>' +
      '</ul>' +
      '<p><strong>Not ideal if you:</strong></p>' +
      '<ul>' +
      '<li>Prefer long term investing and fundamental research</li>' +
      '<li>Do not want to take the high risk that comes with meme tokens</li>' +
      '<li>Want a tool that predicts prices, because GMGN only shows data</li>' +
      '</ul>' +
      '<p><strong>Keep in mind:</strong> meme tokens are extremely volatile and most lose their value quickly. Past results of a wallet do not guarantee future results, and trading through GMGN adds a 1% fee plus network fees on every trade.</p>',
    videos: [
      { url: 'https://www.youtube.com/watch?v=a2WDIWKtBfI', title: 'TUTORIAL: GMGN.IA TRADING CON MEMECOINS BASICO EN SOLANA, ETHEREUM Y BASE 2025', credit: 'Video created by Whale Finance' },
    ],
  },
]

export async function applyExtraTools(log: (m: string) => void = () => {}) {
  for (const x of EXTRA_TOOLS) {
    const existing = await db.tool.findUnique({ where: { wixId: x.wixId } })
    if (existing) {
      continue
    }
    const category = await db.category.findUnique({ where: { wixId: x.collection } })
    if (!category) { log(`Strumento ${x.title}: categoria ${x.collection} non trovata`); continue }
    const last = await db.tool.findFirst({ where: { categoryId: category.id }, orderBy: { sortOrder: 'desc' } })
    const clash = await db.tool.findUnique({ where: { categoryId_slug: { categoryId: category.id, slug: x.slug } } })
    if (clash) { log(`Strumento ${x.title}: esiste già uno strumento con indirizzo ${x.slug}, salto`); continue }
    const tool = await db.tool.create({
      data: {
        wixId: x.wixId, categoryId: category.id, slug: x.slug, title: x.title,
        logoUrl: await mirrorImage(x.logoSource), websiteUrl: x.websiteUrl, refLink: x.refLink ?? null,
        attributes: x.attributes, sortOrder: (last?.sortOrder ?? 0) + 1, status: 'PUBLISHED', publishedAt: new Date(),
        translations: {
          create: { locale: 'EN', description: x.description, fullDescription: x.fullDescription, whatIs: x.whatIs, howItWorks: x.howItWorks, whenToUse: x.whenToUse, tip: x.tip },
        },
        videos: { create: x.videos.map((v, i) => ({ youtubeUrl: v.url, titleEn: v.title, description: v.credit ?? null, sortOrder: i, access: 'PRO' as const })) },
      },
    })
    log(`Strumento aggiunto: ${tool.title}`)
  }
}
