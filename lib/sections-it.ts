/** Versione italiana di sezioni, categorie e descrizioni (stessa chiave dei testi inglesi in sections.ts). */
export const SECTION_IT: Record<string, { title: string; description: string; intro: string }> = {
  'free-earn': {
    title: 'Gratis',
    description: 'Modi per ricevere crypto con airdrop, faucet, attività e giochi.',
    intro: 'Parti da qui se vuoi ricevere crypto senza spendere nulla. Gli airdrop premiano i primi utenti di un nuovo progetto, anche chi prova reti ancora in sviluppo, i faucet regalano piccole somme gratuite, le piattaforme di attività pagano per lavoretti semplici e i giochi possono pagare in token.',
  },
  wallet: {
    title: 'Wallet',
    description: 'Wallet hot e cold per conservare, gestire e proteggere i tuoi asset.',
    intro: 'Il wallet è il posto dove vive davvero la tua crypto e da cui firmi le transazioni. I wallet hot sono app o estensioni del browser sempre online e facili da usare. I wallet cold tengono le chiavi offline su un dispositivo, più sicuro per importi più grandi.',
  },
  exchange: {
    title: 'Exchange',
    description: 'Scambia crypto su piattaforme centralizzate e decentralizzate.',
    intro: 'Gli exchange sono i posti dove compri, vendi e scambi crypto. Quelli centralizzati (CEX) funzionano come l’app di una banca, con account e assistenza. Quelli decentralizzati (DEX) ti permettono di scambiare direttamente dal tuo wallet, senza account.',
  },
  tools: {
    title: 'Strumenti',
    description: 'Strumenti di sicurezza, analisi, portafoglio e spesa: tutto quello che serve.',
    intro: 'Gli aiuti di tutti i giorni attorno alla tua crypto: strumenti di sicurezza che controllano i contratti e proteggono il wallet, strumenti di analisi on-chain e di mercato per informarti prima di decidere, servizi per spendere crypto nella vita reale e carte crypto che trasformano il tuo saldo in una carta di pagamento.',
  },
  grow: {
    title: 'Crescita',
    description: 'Staking, prestiti, launchpad e piattaforme di trading.',
    intro: 'Strumenti per chi vuole approfondire staking, prestiti, launchpad e piattaforme di trading. Sono più complessi che tenere e basta, quindi ogni strumento spiega cosa può andare storto.',
  },
  privacy: {
    title: 'Privacy',
    description: 'Strumenti per la privacy, una carta senza KYC e servizi.',
    intro: 'Per chi vuole tenere privata la propria attività finanziaria. Compra e vendi senza consegnare documenti, gestisci le tue monete in modo che siano più difficili da tracciare e paga con carte che non chiedono chi sei.',
  },
}

/** Nome italiano di ogni categoria (chiave = id collezione Wix). */
export const CATEGORY_NAMES_IT: Record<string, string> = {
  Import7: 'Airdrop',
  Faucet: 'Faucet',
  TaskPlatform: 'Piattaforme di attività',
  Gaming: 'Giochi e metaverso',
  Wallet: 'Wallet',
  ColdWallet: 'Cold wallet',
  ExchangeCEX: 'Exchange centralizzati',
  ExchangeDEX: 'Exchange decentralizzati',
  toolssecurity: 'Strumenti di sicurezza',
  SpendingTools: 'Strumenti per spendere',
  CryptoCard: 'Carte crypto',
  Growth: 'Crescita',
  Launchpad: 'Launchpad',
  Trading: 'Trading',
  Import1: 'Acquisto e vendita privati',
  Import2: 'Gestione della privacy',
  Import4: 'Carte senza KYC',
  toolsanalysis: 'Strumenti di analisi',
}

export const CATEGORY_BLURBS_IT: Record<string, string> = {
  Import7: 'Distribuzioni gratuite di token da nuovi progetti, comprese le ricompense per chi prova nuove reti. Trova quelle attive e come qualificarti.',
  Faucet: 'Siti che regalano piccole somme di crypto, di solito per provare una rete.',
  TaskPlatform: 'Piattaforme che ti pagano in crypto per missioni, sondaggi e lavoretti semplici.',
  Gaming: 'Giochi play-to-earn ed eventi nel metaverso con ricompense in token o NFT.',
  Wallet: 'Wallet sempre online per app, browser e telefono. Facili e veloci da usare.',
  ColdWallet: 'Hardware wallet che tengono le tue chiavi offline. La scelta sicura per importi più grandi.',
  ExchangeCEX: 'Exchange centralizzati con account, pagamenti in valuta e assistenza clienti.',
  ExchangeDEX: 'Scambia direttamente dal tuo wallet, senza account e senza custodia.',
  toolssecurity: 'Controlla token, contratti e permessi, e tieni al sicuro il tuo wallet.',
  SpendingTools: 'Modi per spendere crypto nei negozi e online.',
  CryptoCard: 'Carte che ricarichi con crypto e usi come qualsiasi altra carta di pagamento.',
  Growth: 'Strumenti di staking, prestito e liquidità.',
  Launchpad: 'Piattaforme dove i nuovi token vengono offerti prima di essere quotati ovunque.',
  Trading: 'Piattaforme e strumenti di trading per spot, futures e grafici.',
  Import1: 'Compra e vendi crypto con pochi o nessun controllo d’identità.',
  Import2: 'Strumenti per gestire le tue monete in privato e ridurre la tracciabilità.',
  Import4: 'Carte che puoi ottenere senza verifica d’identità.',
  toolsanalysis: 'Dati on-chain e di mercato per studiare i progetti prima di decidere.',
}

export const CATEGORY_INTROS_IT: Record<string, string> = {
  Import7: 'Un airdrop è una distribuzione gratuita di token da parte di un progetto ai suoi primi utenti. Qui trovi gli airdrop che valgono il tuo tempo, comprese le testnet: versioni di prova di una rete dove nulla ha valore reale e chi la prova per primo viene spesso premiato. Ogni scheda mostra cosa serve per qualificarti e i rischi da tenere d’occhio, come i falsi siti di riscossione.',
  Faucet: 'Un faucet regala piccole somme di crypto, di solito per pagare le commissioni su una nuova rete. Le cifre sono piccole, quindi usali per imparare e iniziare.',
  TaskPlatform: 'Piattaforme che ti pagano in crypto per completare missioni, attività di apprendimento, sondaggi o piccoli lavori. I pagamenti variano molto, quindi ogni scheda indica cosa aspettarti e cosa ti chiede la piattaforma.',
  Gaming: 'Giochi e mondi nel metaverso dove puoi ottenere token o NFT giocando o partecipando a eventi. Controlla il tempo e i costi che richiede ciascuno prima di iniziare.',
  Wallet: 'I wallet hot sono app, estensioni del browser o wallet mobili sempre connessi a internet. Sono il modo più facile per tenere crypto e usare le app, ma per importi grandi conviene affiancarli a un cold wallet.',
  ColdWallet: 'I cold wallet sono dispositivi hardware che tengono le tue chiavi private offline, lontano da virus e phishing. Sono il modo più sicuro per custodire importi più grandi a lungo termine e si firma sul dispositivo stesso.',
  ExchangeCEX: 'Gli exchange centralizzati funzionano come una banca: apri un account, verifichi l’identità e puoi comprare crypto con carta o bonifico. Sono semplici e liquidi, ma l’exchange custodisce i tuoi fondi finché restano sulla piattaforma.',
  ExchangeDEX: 'Gli exchange decentralizzati ti permettono di scambiare token direttamente dal tuo wallet, senza account e senza custodia. Danno più controllo e accesso ai nuovi token, ma paghi le commissioni di rete e devi fare attenzione ai token falsi.',
  toolssecurity: 'Strumenti che ti aiutano a controllare token, smart contract e permessi prima di interagire, e a revocare gli accessi che non ti servono più. Pochi minuti qui possono salvarti da truffe e wallet drainer.',
  SpendingTools: 'Servizi che ti permettono di pagare con crypto nei negozi e online, o di trasformarla in spesa di tutti i giorni. Ogni scheda mostra commissioni, limiti e dove funziona.',
  CryptoCard: 'Le carte crypto sono carte di pagamento che ricarichi con crypto. La carta converte l’importo quando paghi, così puoi spendere in qualsiasi negozio che accetta Visa o Mastercard. Confronta commissioni, limiti e paesi.',
  Growth: 'Strumenti per approfondire staking, prestiti e pool di liquidità, che funzionano bloccando o prestando i propri fondi. Comportano sempre dei rischi e ogni scheda spiega cosa può andare storto.',
  Launchpad: 'I launchpad offrono accesso anticipato a nuovi token prima che siano quotati ovunque. Possono essere interessanti, ma i progetti nuovi sono rischiosi, quindi ogni scheda mostra come partecipare e cosa controllare prima.',
  Trading: 'Piattaforme e strumenti per il trading attivo, dai mercati spot e futures ai grafici e ai bot. Il trading comporta rischi, quindi inizia in piccolo e impara prima come funziona ogni piattaforma.',
  Import1: 'Modi per comprare e vendere crypto con pochi o nessun controllo d’identità, come i mercati peer-to-peer e i servizi con KYC leggero. Le regole cambiano da paese a paese, quindi verifica cosa è consentito dove vivi.',
  Import2: 'Strumenti per gestire le tue monete con più privacy: wallet con controllo delle monete, mixing e modi per evitare di collegare la tua attività. Ognuno spiega cosa nasconde e cosa no.',
  Import4: 'Carte che puoi ottenere senza consegnare documenti d’identità. I limiti sono di solito più bassi e le regole cambiano da paese a paese, quindi ogni scheda mostra cosa aspettarti.',
  toolsanalysis: 'Strumenti di dati che mostrano cosa succede on-chain e sul mercato: chi muove i fondi, dove scorre la liquidità e quali progetti crescono. Usali per informarti prima di decidere.',
}

/** Titolo, descrizione e introduzione di una sezione nella lingua richiesta. */
export function sec<T extends { key: string; title: string; description: string; intro: string }>(s: T, it: boolean): T {
  return it && SECTION_IT[s.key] ? { ...s, ...SECTION_IT[s.key] } : s
}
export const blurbOf = (wixId: string, blurbs: Record<string, string>, it: boolean) => (it ? CATEGORY_BLURBS_IT[wixId] : undefined) ?? blurbs[wixId] ?? ''
export const introOf = (wixId: string, intros: Record<string, string>, it: boolean) => (it ? CATEGORY_INTROS_IT[wixId] : undefined) ?? intros[wixId] ?? ''
