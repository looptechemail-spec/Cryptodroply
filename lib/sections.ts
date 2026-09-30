/**
 * Le sei sezioni della home e il menu, con le categorie (collezioni Wix) che contengono.
 * DA CONFERMARE: l'abbinamento categoria -> sezione è una prima stima dal menu attuale.
 * Si cambia solo qui.
 */
export type Section = {
  key: string
  title: string
  description: string
  pro: boolean
  collections: string[] // id collezione Wix (Category.wixId)
}

export const SECTIONS: Section[] = [
  {
    key: 'free-earn',
    title: 'Free earn',
    description: 'Ways to earn crypto through airdrops, testnets and faucets.',
    pro: false,
    collections: ['Import7', 'Import8', 'Faucet', 'TaskPlatform', 'Gaming'],
  },
  {
    key: 'wallet',
    title: 'Wallet',
    description: 'Hot and cold wallets to store, manage and protect your assets.',
    pro: false,
    collections: ['Wallet', 'ColdWallet'],
  },
  {
    key: 'exchange',
    title: 'Exchange',
    description: 'Trade crypto on centralized and decentralized platforms.',
    pro: false,
    collections: ['ExchangeCEX', 'ExchangeDEX'],
  },
  {
    key: 'tools',
    title: 'Tools',
    description: 'Security, analysis, portfolio and spending tools.',
    pro: false,
    collections: ['toolssecurity', 'SpendingTools', 'CryptoCard'],
  },
  {
    key: 'grow',
    title: 'Grow',
    description: 'Staking, lending, launchpads and trading platforms.',
    pro: true,
    collections: ['Growth', 'Launchpad', 'Trading'],
  },
  {
    key: 'privacy',
    title: 'Privacy',
    description: 'Privacy tools, a no-KYC card and services.',
    pro: true,
    collections: ['Import1', 'Import2', 'Import4'],
  },
  {
    key: 'analysis',
    title: 'Analysis',
    description: 'On-chain and market analysis tools.',
    pro: true,
    collections: ['toolsanalysis'],
  },
]

export const sectionHref = (key: string) => `/s/${key}`
