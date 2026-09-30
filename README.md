# Cryptodroply

Sito di Cryptodroply (aggregatore di strumenti crypto), rifatto da zero: frontend, backend e database in un unico progetto su Railway.

## Stack

- Next.js (sito pubblico, area membri, pannello admin, API)
- PostgreSQL con Prisma (schema in `prisma/schema.prisma`)
- Stripe: unico piano PRO a 14 EUR/mese
- n8n: automazioni, collegato tramite API con chiave

## Struttura su Railway

Un progetto con tre servizi: `web` (questo repository), `Postgres` e `n8n`.
Variabili d'ambiente: vedi `.env.example`.

## Comandi

```bash
npm install
cp .env.example .env      # compila DATABASE_URL e le chiavi
npx prisma validate
npm run db:migrate        # crea le tabelle
npm run dev
```

## Stato

- [x] Schema database
- [x] Configurazione Railway
- [ ] Import contenuti da Wix
- [ ] Pagine pubbliche (EN + IT) con gli stessi URL di oggi
- [ ] Area membri e abbonamento Stripe
- [ ] Pannello admin e API per n8n
- [ ] Dashboard click affiliati
- [ ] Newsletter
