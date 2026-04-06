
# TALA Project Web App

This repository is a Vite + React + TypeScript implementation of the TALA prototype.

## What Changed In This Refactor

Before this refactor, core screens used hardcoded page-local arrays/objects:

- [src/app/pages/Overview.tsx](src/app/pages/Overview.tsx)
- [src/app/pages/Diagnose.tsx](src/app/pages/Diagnose.tsx)
- [src/app/pages/Advise.tsx](src/app/pages/Advise.tsx)
- [src/app/pages/DataManager.tsx](src/app/pages/DataManager.tsx)

Now, those pages load data through a shared Supabase-backed service layer with a centralized dev fallback seed.

## Data Layer Structure

Supabase client:

- [src/lib/supabase/client.ts](src/lib/supabase/client.ts)
- [src/lib/supabase/types.ts](src/lib/supabase/types.ts)

Feature APIs:

- [src/features/overview/api/overview.ts](src/features/overview/api/overview.ts)
- [src/features/diagnose/api/diagnose.ts](src/features/diagnose/api/diagnose.ts)
- [src/features/advise/api/advise.ts](src/features/advise/api/advise.ts)
- [src/features/data-manager/api/data-manager.ts](src/features/data-manager/api/data-manager.ts)

Shared fallback + mapping:

- [src/features/shared/dev-seed/index.ts](src/features/shared/dev-seed/index.ts)
- [src/features/shared/mappers/formatters.ts](src/features/shared/mappers/formatters.ts)
- [src/features/shared/api/query-with-fallback.ts](src/features/shared/api/query-with-fallback.ts)
- [src/features/shared/types/view-models.ts](src/features/shared/types/view-models.ts)

## Database Schema Coverage

Migrations are under [supabase/migrations](supabase/migrations).

Tables and views used by screens include:

- `regions`, `divisions`, `schools`
- `star_programs`, `teachers`, `training_participation`
- `school_context`, `regional_context`
- `recommendations`
- `data_sources`, `upload_batches`, `validation_issues`, `data_quality_snapshots`
- `ingestion_batches` (view)
- `data_quality_issues` (view)
- `v_data_source_registry`, `v_validation_issue_summary`, `v_region_data_quality_latest`

New operational/seed migrations for app screens:

- [supabase/migrations/0008_domain_operational_tables.sql](supabase/migrations/0008_domain_operational_tables.sql)
- [supabase/migrations/0009_seed_regions_programs_demo.sql](supabase/migrations/0009_seed_regions_programs_demo.sql)

## Screen To Table Mapping

- Overview:
  - `regional_context`
  - `training_participation`
  - `teachers`
  - `recommendations`
  - `star_programs`
- Diagnose:
  - `regional_context`
  - `divisions`
  - `teachers`
  - `school_context`
- Advise:
  - `recommendations`
  - `star_programs`
  - `regions`
- Data Manager:
  - `v_data_source_registry`
  - `v_validation_issue_summary`
  - `v_region_data_quality_latest`

## Environment Variables

Set client env vars in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Reference file:

- [.env.example](.env.example)

Note: the client also accepts existing `NEXT_PUBLIC_*` Supabase keys for compatibility, but `VITE_*` is the preferred format for this Vite app.

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

## What Is Still Prototype-Level

- Upload action handlers in pages still show toast placeholders
- No ingestion pipeline writes CSV rows into staging tables yet
- No auth or permission enforcement in frontend

## Next For Full CSV Ingestion

1. Add upload UI to send files to Supabase Storage
2. Add ingestion worker/edge function to parse CSV and write staging tables
3. Normalize tokens using alias tables (`region_aliases`, `specialization_aliases`, `boolean_token_map`, `accepted_date_formats`)
4. Recompute quality snapshots and recommendation inputs after each batch
  