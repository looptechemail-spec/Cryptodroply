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
    description: 'Ways to earn crypto through airdrops, faucets, tasks and games.',
    intro: 'Start here if you want to earn crypto without putting money in. Airdrops reward early users of a new project, including people who test unfinished networks, faucets hand out small free amounts, task platforms pay for simple jobs and games can pay out in tokens.',
    pro: false,
    collections: ['Import7', 'Faucet', 'TaskPlatform', 'Gaming'],
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
    description: 'Tools and guides to protect your personal data and understand how privacy works in crypto.',
    intro: 'For people who want to understand and protect their personal data when using crypto. Learn how privacy works on public blockchains, which tools help keep your information safe and what the rules are where you live. Always follow the laws and the platform rules of your country.',
    pro: true,
    collections: ['Import1', 'Import2', 'Import4'],
  },
]

export const sectionHref = (key: string) => `/s/${key}`

/** Spiegazione breve di ogni sottocategoria (chiave = id collezione Wix). Modificabile qui. */
export const CATEGORY_BLURBS: Record<string, string> = {
  Import7: 'Free token drops from new projects, including rewards for testing new networks. Find the active ones and how to qualify.',
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
  Import1: 'Peer-to-peer markets and services, explained: how they work, which checks they apply and which rules to follow.',
  Import2: 'Wallet features and habits that help protect your personal data on public blockchains.',
  Import4: 'Payment cards that limit the personal data you share, with checks, limits and fees explained.',
  toolsanalysis: 'On-chain and market data to research projects before you invest.',
}

/** Spiegazione più completa di ogni sottocategoria, sotto il titolo della pagina e del pannello. */
export const CATEGORY_INTROS: Record<string, string> = {
  Import7: 'An airdrop is a free distribution of tokens from a project to its early users. Here you find the airdrops worth your time, including testnets: trial versions of a network where nothing has real value and early testers are often rewarded. Each listing shows what you need to do to qualify and the risks to watch for, such as fake claim sites.',
  Faucet: 'A faucet gives out small amounts of crypto for free, usually so you can pay fees on a new network. The amounts are small, so use them to learn and to get started rather than to earn a living.',
  TaskPlatform: 'Platforms that pay you in crypto for completing quests, learning tasks, surveys or small jobs. Payouts vary a lot, so each listing shows what to expect and what the platform asks from you.',
  Gaming: 'Games and metaverse worlds where you can earn tokens or NFTs by playing or joining events. Check the time and money each one asks for before you start.',
  Wallet: 'Hot wallets are apps, browser extensions or mobile wallets that stay connected to the internet. They are the easiest way to hold crypto and use apps, but for large amounts they are best paired with a cold wallet.',
  ColdWallet: 'Cold wallets are hardware devices that keep your private keys offline, away from viruses and phishing. They are the safest way to store larger amounts for the long term and are signed on the device itself.',
  ExchangeCEX: 'Centralized exchanges work like a bank: you open an account, verify your identity and can buy crypto with a card or bank transfer. They are simple and liquid, but the exchange holds your funds while they are on the platform.',
  ExchangeDEX: 'Decentralized exchanges let you swap tokens straight from your own wallet with no account and no custody. They give you more control and access to new tokens, but you pay network fees and must watch for fake tokens.',
  toolssecurity: 'Tools that help you check tokens, smart contracts and approvals before you interact with them, and revoke access you no longer need. A few minutes here can save you from scams and wallet drainers.',
  SpendingTools: 'Services that let you pay with crypto in shops and online, or turn it into everyday spending. Each listing shows fees, limits and where it works.',
  CryptoCard: 'Crypto cards are payment cards you top up with crypto. The card converts the amount when you pay, so you can spend in any shop that accepts Visa or Mastercard. Compare fees, limits and countries.',
  Growth: 'Ways to put the crypto you hold to work: staking, lending and liquidity pools pay a yield in return for locking or lending your funds. Yield always comes with risk, and each listing explains what can go wrong.',
  Launchpad: 'Launchpads offer early access to new tokens before they are widely listed. They can be attractive, but early projects are risky, so each listing shows how to join and what to check first.',
  Trading: 'Platforms and tools for active trading, from spot and futures markets to charts and bots. Trading can lose money quickly, so start small and learn how each platform works first.',
  Import1: 'Peer-to-peer markets let people trade directly with each other. Here you learn how they work, how to protect your personal data while using them and how to stay within the rules of your country and of each platform. Always check your local regulations before using any service.',
  Import2: 'Blockchains are public, so addresses and transactions can be seen by anyone. These tools and guides explain how to protect your data: good wallet habits, careful use of addresses and ways to limit what you share. Each one explains what it protects and what it does not.',
  Import4: 'Some payment cards ask for fewer personal details and apply lower limits. Each listing explains what the issuer checks, the limits, the fees and the rules that apply by country, so you can decide if it fits your needs. Always follow the rules of your country and of the issuer.',
  toolsanalysis: 'Data tools that show what is happening on chain and in the market: who moves funds, where liquidity flows and which projects are growing. Use them to research before you commit money.',
}

/** Nome inglese forzato per le categorie il cui nome su Wix è in italiano (chiave = id collezione Wix). */
export const CATEGORY_NAMES: Record<string, string> = {
  Import1: 'Peer-to-Peer Markets',
  Import2: 'Privacy Management',
  Import4: 'Privacy Cards',
}

/** Categorie assorbite in un'altra: tutti i loro tool passano nella categoria di destinazione. */
export const MERGED_INTO: Record<string, string> = {
  Import8: 'Import7', // Testnet -> Airdrop
}
