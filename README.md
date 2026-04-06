
# TALA Project Web App

This repository is a Vite + React + TypeScript implementation of the TALA prototype.

## Environment Variables

Set client env vars in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Reference file:

- [.env.example](.env.example)

## Run Locally

1. Install dependencies:

```bash
npm i
```

2. Start dev server:

```bash
npm run dev
```

## Run Supabase Migrations

If using Supabase CLI:

```bash
supabase db push
```

Or apply SQL files manually in Supabase SQL Editor in migration order.

## Reseed / Reset Workflow

For remote environments:

1. Apply latest migrations:

```bash
supabase db push --yes
```

For local environments:

1. Reset and reseed local database from migrations:

```bash
supabase db reset
```

2. Start app normally:

```bash
npm run dev
```

## Dev Fallback Mode

If Supabase env vars are missing or a query fails in development:

- The feature API returns centralized fallback data from [src/features/shared/dev-seed/index.ts](src/features/shared/dev-seed/index.ts)
- The UI still renders and shows a data warning banner

This keeps hackathon development unblocked while Supabase setup evolves.

## Synthetic CSV Demo Generator

Generate upload-ready CSVs with messy, realistic values:

```bash
python scripts/generate_demo_csv.py --out demo_uploads
```

Script:

- [scripts/generate_demo_csv.py](scripts/generate_demo_csv.py)
  