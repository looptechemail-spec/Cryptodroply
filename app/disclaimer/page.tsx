import type { Metadata } from 'next'
import Link from '@/components/LocLink'
import LegalPage from '@/components/LegalPage'
import { i18n } from '@/lib/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return {
    title: t('Disclaimer and affiliate disclosure', 'Disclaimer e informativa sull\'affiliazione'),
    description: t('Cryptodroply does not give financial advice. Some links are affiliate links.', 'Cryptodroply non dà consulenza finanziaria. Alcuni link sono link di affiliazione.'),
  }
}

export default async function Disclaimer() {
  const { t, it } = await i18n()
  return (
    <LegalPage title="Disclaimer" intro={t('Not financial advice, and how we earn money.', 'Nessuna consulenza finanziaria, e come guadagniamo.')}>
      <div className="sec">
        <h2>{t('Not financial advice', 'Nessuna consulenza finanziaria')}</h2>
        <p>{t('Cryptodroply provides information and education only. Nothing on this site, including analyses, tutorials and tool reviews, is investment, financial, tax or legal advice, or an invitation to buy or sell any asset. Do your own research and talk to a qualified professional before you decide.', 'Cryptodroply offre solo informazione ed educazione. Nulla su questo sito, comprese analisi, tutorial e recensioni degli strumenti, costituisce consulenza in materia di investimenti, finanza, fisco o legge, né un invito ad acquistare o vendere alcun asset. Fai le tue ricerche e parla con un professionista qualificato prima di decidere.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Crypto is risky', 'Le crypto sono rischiose')}</h2>
        <p>{t('Crypto assets are volatile and you can lose all the money you put in. Airdrops, meme tokens and new protocols carry extra risk, including scams and smart contract failures. Past results do not guarantee future results. Only use money you can afford to lose and never share your seed phrase.', 'Le crypto-attività sono volatili e puoi perdere tutto il denaro che investi. Airdrop, meme token e nuovi protocolli comportano rischi aggiuntivi, tra cui truffe e guasti degli smart contract. I risultati passati non garantiscono risultati futuri. Usa solo denaro che puoi permetterti di perdere e non condividere mai la tua seed phrase.')}</p>
      </div>
      <div className="sec">
        <h2>{t('Affiliate disclosure', 'Informativa sull\'affiliazione')}</h2>
        <p>{it
          ? <>Alcuni link a strumenti ed exchange sono link di affiliazione. Se ti registri tramite questi link possiamo ricevere una commissione o un bonus, senza costi aggiuntivi per te, e questo ci aiuta a mantenere online i contenuti gratuiti. Non cambia il modo in cui descriviamo uno strumento. Abbiamo anche un nostro programma referral, vedi la <Link href="/affiliate">pagina referral</Link>.</>
          : <>Some links to tools and exchanges are affiliate links. If you sign up through them we may earn a commission or a bonus, at no extra cost to you, and this helps us keep the free content online. It does not change how we describe a tool. We also run our own referral program, see the <Link href="/affiliate">referral page</Link>.</>}</p>
      </div>
      <div className="sec">
        <h2>{t('Third party tools', 'Strumenti di terze parti')}</h2>
        <p>{t('Tools in the directory are made by other companies. We do not control them and we do not guarantee their security, availability or fees. Check the official site before using any of them.', 'Gli strumenti della directory sono realizzati da altre aziende. Non li controlliamo e non ne garantiamo sicurezza, disponibilità o commissioni. Controlla il sito ufficiale prima di usarli.')}</p>
      </div>
    </LegalPage>
  )
}
