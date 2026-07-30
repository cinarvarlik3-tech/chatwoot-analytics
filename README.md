# Chatwoot Analytics Dashboard

Next.js dashboard for Univotel Chatwoot data (messages, leads, schools, channels). Data is stored in Supabase — this repo contains only the frontend and API layer.

## Setup

```bash
npm install
cp .env.example .env.local
```

Add your Supabase **pooler** connection string to `.env.local`:

```env
CHATWOOT_DATABASE_URL=postgresql://postgres.xxxx:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

Use port **6543** (pooler) for serverless hosts like Vercel.

## Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Deploy (Vercel)

1. Import this repository
2. Set `CHATWOOT_DATABASE_URL` in project environment variables
3. Deploy

## Metrics

- **Message volume** — rows in `messages`
- **Lead volume** — unique `conversations`
- **School** — parsed `university` on conversations; unparsed rows show as "Belirtilmemiş"
- **Channel** — WhatsApp / Instagram via `inboxes`
