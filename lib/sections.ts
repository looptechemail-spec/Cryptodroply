/**
 * Le sei sezioni della home e il menu, con le categorie (collezioni Wix) che contengono.
 * DA CONFERMARE: l'abbinamento categoria -> sezione è una prima stima dal menu attuale.
 * Si cambia solo qui.
 */
export type Section = {
  key: string
  title: string
  description: string
  intro: string // spiegazione più lunga, mostrata in cima alla pagina della sezione
  pro: boolean
  collections: string[] // id collezione Wix (Category.wixId)
}

export const SECTIONS: Section[] = [
  {
    key: 'free-earn',
    title: 'Free earn',
    description: 'Ways to earn crypto through airdrops, testnets and faucets.',
    intro: 'Start here if you want to earn crypto without putting money in. Airdrops reward early users of a new project, testnets let you try unfinished networks that often reward testers, faucets hand out small free amounts, task platforms pay for simple jobs and games can pay out in tokens.',
    pro: false,
    collections: ['Import7', 'Import8', 'Faucet', 'TaskPlatform', 'Gaming'],
  },
  {
    key: 'wallet',
    title: 'Wallet',
    description: 'Hot and cold wallets to store, manage and protect your assets.',
    intro: 'A wallet is where your crypto actually lives and where you sign transactions. Hot wallets are apps or browser extensions that are always online and easy to use. Cold wallets keep your keys offline on a device, which is safer for larger amounts.',
    pro: false,
    collections: ['Wallet', 'ColdWallet'],
  },
  {
    key: 'exchange',
    title: 'Exchange',
    description: 'Trade crypto on centralized and decentralized platforms.',
    intro: 'Exchanges are where you buy, sell and swap crypto. Centralized exchanges (CEX) work like a bank app with an account and support. Decentralized exchanges (DEX) let you swap straight from your own wallet with no account.',
    pro: false,
    collections: ['ExchangeCEX', 'ExchangeDEX'],
  },
  {
    key: 'tools',
    title: 'Tools',
    description: 'Security, analysis, portfolio and spending tools, everything you need.',
    intro: 'Everyday helpers around your crypto: security tools that check contracts and protect your wallet, on-chain and market analysis tools to research before you invest, tools to spend crypto in real life and crypto cards that turn your balance into a payment card.',
    pro: false,
    collections: ['toolssecurity', 'toolsanalysis', 'SpendingTools', 'CryptoCard'],
  },
  {
    key: 'grow',
    title: 'Grow',
    description: 'Staking, lending, launchpads and trading platforms.',
    intro: 'Ways to make your holdings work for you: earn yield by staking or lending, join new projects early through launchpads and trade with advanced platforms. More risk than holding, so each tool explains what can go wrong.',
    pro: true,
    collections: ['Growth', 'Launchpad', 'Trading'],
  },
  {
    key: 'privacy',
    title: 'Privacy',
    description: 'Privacy tools, a no-KYC card and services.',
    intro: 'For people who want to keep their financial activity private. Buy and sell without handing over documents, manage your coins so they are harder to trace and pay with cards that do not ask who you are.',
    pro: true,
    collections: ['Import1', 'Import2', 'Import4'],
  },
]

export const sectionHref = (key: string) => `/s/${key}`

/** Spiegazione breve di ogni sottocategoria (chiave = id collezione Wix). Modificabile qui. */
export const CATEGORY_BLURBS: Record<string, string> = {
  Import7: 'Free token drops from new projects. Find the active ones and how to qualify.',
  Import8: 'Test unfinished networks and apps. Testers are often rewarded when the project launches.',
  Faucet: 'Sites that give small amounts of free crypto, usually to try a network.',
  TaskPlatform: 'Platforms that pay you in crypto for quests, surveys and simple jobs.',
  Gaming: 'Play-to-earn games and metaverse events with token or NFT rewards.',
  Wallet: 'Always-online wallets for apps, browsers and phones. Easy and quick to use.',
  ColdWallet: 'Hardware wallets that keep your keys offline. The safe choice for larger amounts.',
  ExchangeCEX: 'Centralized exchanges with accounts, fiat payments and customer support.',
  ExchangeDEX: 'Swap straight from your own wallet, with no account and no custody.',
  toolssecurity: 'Check tokens, contracts and approvals, and keep your wallet safe.',
  SpendingTools: 'Ways to spend crypto in shops and online.',
  CryptoCard: 'Cards you top up with crypto and use like any other payment card.',
  Growth: 'Staking, lending and liquidity tools to earn yield on what you hold.',
  Launchpad: 'Platforms where new tokens are offered before they are widely listed.',
  Trading: 'Trading platforms and tools for spot, futures and charting.',
  Import1: 'Buy and sell crypto with little or no identity checks.',
  Import2: 'Tools to manage your coins privately and reduce traceability.',
  Import4: 'Cards you can get without identity verification.',
  toolsanalysis: 'On-chain and market data to research projects before you invest.',
}
