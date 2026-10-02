import Link from '@/components/LocLink'
import { i18n } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { hasPro, PRO_PRICE_LABEL } from '@/lib/access'
import { stripeReady } from '@/lib/stripe'
import { AppCard } from '@/components/AppCard'
import { pick } from '@/lib/content'
import { headers } from 'next/headers'
import { CopyLink } from '@/components/CopyLink'
import { COMMISSION_RATE, HOLD_DAYS, MIN_PAYOUT_CENTS, RECURRING, earnings, ensureReferralCode, euro } from '@/lib/referral'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n()
  return { title: t('Your account', 'Il tuo account'), robots: { index: false } }
}

type SP = { checkout?: string; welcome?: string; error?: string; saved?: string }

export default async function Account({ searchParams }: { searchParams: Promise<SP> }) {
  const { t, it, lang, loc, href } = await i18n()
  const user = await getUser()
  if (!user) redirect(href('/login'))
  const { checkout, welcome, error, saved } = await searchParams
  const pro = await hasPro()
  const sub = user.subscription
  const fmt = (d: Date | null | undefined) => d?.toLocaleDateString(it ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const [favs, subscriber] = await Promise.all([
    db.favorite.findMany({
      where: { userId: user.id, tool: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      include: { tool: { include: { translations: true, category: { include: { translations: true } } } } },
    }),
    db.subscriber.findUnique({ where: { email: user.email.toLowerCase() } }),
  ])
  const code = await ensureReferralCode(user.id, user.referralCode)
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'cryptodroply.com'
  const refLink = `https://${host}/r/${code}`
  const [earn, signups, payingReferrals] = await Promise.all([
    earnings(user.id),
    db.user.count({ where: { referredById: user.id } }),
    db.user.count({ where: { referredById: user.id, subscription: { status: { in: ['ACTIVE', 'TRIALING'] } } } }),
  ])
  const newsletterOn = !!subscriber && !subscriber.unsubscribedAt && !!subscriber.confirmedAt

  return (
    <div className="container">
      <div className="page-head">
        <h1>{user.name ? t(`Hi, ${user.name}`, `Ciao, ${user.name}`) : t('Your account', 'Il tuo account')}</h1>
        <p style={{ color: 'var(--muted)' }}>{user.email}</p>
      </div>
      {welcome && <div className="auth-ok">{t('Thank you. Your PRO access is being activated and appears here within a minute.', 'Grazie. Il tuo accesso PRO sta per essere attivato e comparirà qui entro un minuto.')}</div>}
      {saved && <div className="auth-ok">{t('Saved.', 'Salvato.')}</div>}
      {error === 'stripe' && <div className="auth-error">{t('Payments are not available yet. Please try again soon.', 'I pagamenti non sono ancora disponibili. Riprova a breve.')}</div>}
      {error === 'password' && <div className="auth-error">{t('The current password is not correct.', 'La password attuale non è corretta.')}</div>}
      {error === 'short' && <div className="auth-error">{t('The new password must have at least 8 characters.', 'La nuova password deve avere almeno 8 caratteri.')}</div>}

      <div className="dash">
        <aside className="dash-side">
          <div className={`dash-card ${pro ? 'dash-pro' : ''}`}>
            <h2>
              {pro ? 'PRO' : t('Free plan', 'Piano gratuito')} {pro && <span className="badge-pro pro-on-dark">{t('Active', 'Attivo')}</span>}
            </h2>
            <p>
              {pro
                ? sub?.cancelAtPeriodEnd
                  ? t(`PRO stays active until ${fmt(sub.currentPeriodEnd)} and will not renew.`, `PRO resta attivo fino al ${fmt(sub.currentPeriodEnd)} e non si rinnoverà.`)
                  : sub?.currentPeriodEnd
                    ? t(`Next payment on ${fmt(sub.currentPeriodEnd)}.`, `Prossimo pagamento il ${fmt(sub.currentPeriodEnd)}.`)
                    : t('All sections are open to you.', 'Tutte le sezioni sono aperte per te.')
                : t(`PRO is ${PRO_PRICE_LABEL}: Grow and Privacy sections and full analyses.`, `PRO costa ${PRO_PRICE_LABEL}: sezioni Grow e Privacy e analisi complete.`)}
            </p>
            {!pro && (
              <form method="post" action="/api/stripe/checkout">
                <button className="btn btn-blue" type="submit" disabled={!stripeReady()}>
                  {checkout ? t('Continue to payment', 'Continua al pagamento') : t('Get PRO', 'Passa a PRO')}
                </button>
                {!stripeReady() && <p className="dash-stat">{t('Payments are being set up.', 'I pagamenti sono in fase di configurazione.')}</p>}
              </form>
            )}
            {user.stripeCustomerId && (
              <form method="post" action="/api/stripe/portal" style={{ marginTop: 12 }}>
                <button className={`btn ${pro ? 'btn-yellow' : 'btn-outline-dark'}`} type="submit">
                  {t('Billing and invoices', 'Fatturazione e ricevute')}
                </button>
              </form>
            )}
          </div>
          <div className="dash-card">
            <nav className="dash-nav">
              <a href="#saved">{t('Saved tools', 'Strumenti salvati')}</a>
              <a href="#earn">{t('Earn 30%', 'Affiliati 30%')}</a>
              {pro && <Link href="/analyses">{t('Analyses', 'Analisi')}</Link>}
              {pro && <Link href="/s/grow">Grow</Link>}
              {pro && <Link href="/s/privacy">Privacy</Link>}
              <a href="#profile">{t('Profile', 'Profilo')}</a>
              <a href="#password">Password</a>
              <a href="#newsletter">Newsletter</a>
              <Link href="/contact">{t('Help', 'Aiuto')}</Link>
            </nav>
            <form method="post" action="/api/auth/logout" style={{ marginTop: 14 }}>
              <button className="btn btn-outline-dark" type="submit">
                {t('Log out', 'Esci')}
              </button>
            </form>
          </div>
        </aside>

        <div className="dash-main">
          <section className="dash-card" id="saved">
            <h2>{t('Saved tools', 'Strumenti salvati')}</h2>
            {favs.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>
                {t('Nothing saved yet. Press Save on a tool page and it appears here.', 'Ancora nulla di salvato. Premi Salva nella pagina di uno strumento e lo trovi qui.')} <Link href="/s/wallet">{t('Browse the store', 'Sfoglia lo store')}</Link>.
              </p>
            ) : (
              <div className="fav-grid">
                {favs.map((f) => {
                  const tr = pick(f.tool.translations, loc)
                  return (
                    <AppCard
                      key={f.toolId}
                      tool={{
                        id: f.tool.id, slug: f.tool.slug, title: f.tool.title, logoUrl: f.tool.logoUrl, coverUrl: f.tool.coverUrl,
                        description: tr?.description ?? null, categorySlug: f.tool.category.slug,
                        categoryName: pick(f.tool.category.translations, loc)?.name ?? f.tool.category.slug,
                      }}
                      lang={lang}
                    />
                  )
                })}
              </div>
            )}
          </section>

          <section className="dash-card" id="earn">
            <h2>{t(`Earn ${COMMISSION_RATE * 100}% on every PRO you bring`, `Ricevi il ${COMMISSION_RATE * 100}% su ogni PRO che porti`)}</h2>
            <p style={{ color: 'var(--muted)' }}>
              {t(
                `Share your personal link. When someone signs up through it and subscribes to PRO, you earn ${COMMISSION_RATE * 100}% of what they pay (${euro(1400 * COMMISSION_RATE)} on each €14 payment${RECURRING ? ', every month they stay' : ', on the first payment'}).`,
                `Condividi il tuo link personale. Quando qualcuno si registra con quel link e sottoscrive PRO, ricevi il ${COMMISSION_RATE * 100}% di ciò che paga (${euro(1400 * COMMISSION_RATE)} su ogni pagamento da €14${RECURRING ? ', ogni mese in cui resta iscritto' : ', sul primo pagamento'}).`,
              )}
            </p>
            <CopyLink value={refLink} lang={lang} />
            <div className="earn-grid">
              <div className="earn-box"><b>{signups}</b><span>{t('sign-ups', 'registrazioni')}</span></div>
              <div className="earn-box"><b>{payingReferrals}</b><span>{t('active PRO', 'PRO attivi')}</span></div>
              <div className="earn-box"><b>{euro(earn.pending)}</b><span>{t(`in ${HOLD_DAYS}-day hold`, `in attesa (${HOLD_DAYS} giorni)`)}</span></div>
              <div className="earn-box"><b>{euro(earn.available)}</b><span>{t('ready to be paid', 'pronti per il pagamento')}</span></div>
              <div className="earn-box"><b>{euro(earn.paid)}</b><span>{t('already paid', 'già pagati')}</span></div>
            </div>
            <p className="dash-stat">
              {t(
                `Commissions become payable ${HOLD_DAYS} days after each payment, if it is not refunded. Payouts are made once you reach ${euro(MIN_PAYOUT_CENTS)}. Using your own link for yourself does not count.`,
                `Le commissioni diventano pagabili ${HOLD_DAYS} giorni dopo ogni pagamento, se non viene rimborsato. I pagamenti partono quando raggiungi ${euro(MIN_PAYOUT_CENTS)}. Usare il tuo link per te stesso non conta.`,
              )}{' '}
              <Link href="/affiliate">{t('Programme details', 'Dettagli del programma')}</Link>
            </p>
            <form method="post" action="/api/account/payout" className="row-form" style={{ marginTop: 14 }}>
              <label>
                {t('Where to pay you (PayPal email or USDT address)', 'Dove pagarti (email PayPal o indirizzo USDT)')}
                <input name="payoutInfo" defaultValue={user.payoutInfo ?? ''} maxLength={200} style={{ minWidth: 320 }} />
              </label>
              <button className="btn btn-outline-dark" type="submit">{t('Save', 'Salva')}</button>
            </form>
            {earn.rows.length > 0 && (
              <table className="admin-table" style={{ marginTop: 18 }}>
                <thead><tr><th>{t('Date', 'Data')}</th><th>{t('Commission', 'Commissione')}</th><th>{t('Status', 'Stato')}</th></tr></thead>
                <tbody>
                  {earn.rows.slice(0, 10).map((c) => (
                    <tr key={c.id}>
                      <td>{c.createdAt.toISOString().slice(0, 10)}</td>
                      <td>{euro(c.amountCents)}</td>
                      <td>{c.status === 'PAID' ? t('Paid', 'Pagata') : c.status === 'VOID' ? t('Refunded', 'Rimborsata') : t('Pending', 'In attesa')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="dash-card" id="profile">
            <h2>{t('Profile', 'Profilo')}</h2>
            <form method="post" action="/api/account/profile" className="row-form">
              <label>
                {t('Your name', 'Il tuo nome')}
                <input name="name" defaultValue={user.name ?? ''} maxLength={80} />
              </label>
              <button className="btn btn-blue" type="submit">
                {t('Save', 'Salva')}
              </button>
            </form>
          </section>

          <section className="dash-card" id="password">
            <h2>{t('Change password', 'Cambia password')}</h2>
            <form method="post" action="/api/account/password" className="row-form">
              <label>
                {t('Current password', 'Password attuale')}
                <input name="current" type="password" required autoComplete="current-password" />
              </label>
              <label>
                {t('New password (8+ characters)', 'Nuova password (almeno 8 caratteri)')}
                <input name="next" type="password" required minLength={8} autoComplete="new-password" />
              </label>
              <button className="btn btn-blue" type="submit">
                {t('Change', 'Cambia')}
              </button>
            </form>
          </section>

          <section className="dash-card" id="newsletter">
            <h2>Newsletter</h2>
            <p style={{ color: 'var(--muted)' }}>{newsletterOn ? t('You receive our newsletter.', 'Ricevi la nostra newsletter.') : t('You are not subscribed to the newsletter.', 'Non sei iscritto alla newsletter.')}</p>
            <form method="post" action="/api/account/newsletter">
              <input type="hidden" name="on" value={newsletterOn ? '0' : '1'} />
              <button className="btn btn-outline-dark" type="submit">
                {newsletterOn ? t('Unsubscribe', 'Annulla iscrizione') : t('Subscribe', 'Iscriviti')}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
