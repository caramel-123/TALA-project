
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
- [src/features/overview/api/get-overview-kpis.ts](src/features/overview/api/get-overview-kpis.ts)
- [src/features/overview/api/get-overview-dashboard-data.ts](src/features/overview/api/get-overview-dashboard-data.ts)
- [src/features/overview/api/get-priority-regions.ts](src/features/overview/api/get-priority-regions.ts)
- [src/features/overview/api/get-regional-profiles.ts](src/features/overview/api/get-regional-profiles.ts)
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
- `division_priority_metrics` (view)

New operational/seed migrations for app screens:

- [supabase/migrations/0008_domain_operational_tables.sql](supabase/migrations/0008_domain_operational_tables.sql)
- [supabase/migrations/0009_seed_regions_programs_demo.sql](supabase/migrations/0009_seed_regions_programs_demo.sql)
- [supabase/migrations/0010_dashboard_story_seed_enhancement.sql](supabase/migrations/0010_dashboard_story_seed_enhancement.sql)
- [supabase/migrations/0011_overview_kpi_priority_metrics_and_density_seed.sql](supabase/migrations/0011_overview_kpi_priority_metrics_and_density_seed.sql)
- [supabase/migrations/0012_prototype_public_read_access.sql](supabase/migrations/0012_prototype_public_read_access.sql)
- [supabase/migrations/0013_dashboard_public_read_policies.sql](supabase/migrations/0013_dashboard_public_read_policies.sql)

## Overview KPI Computation Rules

The four Overview KPI cards are computed from Supabase data in [src/features/overview/api/get-overview-kpis.ts](src/features/overview/api/get-overview-kpis.ts).

1. Active Regions

- Definition: unique regions with planning/operations signals in any of these sources:
  - `regional_context.region_id`
  - `divisions.region_id`
  - `teachers.region_id`
  - inferred region from `schools.division_id -> divisions.region_id`
- Formula: `count(distinct region_id)` across merged region IDs.

2. Data Completeness

- Definition: weighted required-field completeness across teacher, school, division, and regional context records.
- Field-level completeness per table:
  - Teacher required fields: `teacher_code`, `region_id`, `division_id`, `school_id`, `specialization`, `years_experience`
  - School required fields: `school_id_code`, `school_name`, `division_id`
  - Division required fields: `division_code`, `division_name`, `region_id`
  - Regional context required fields: `region_id`, `star_coverage_pct`, `underserved_score`, `data_quality_score`, `data_completeness_pct`
- Weighted rollup formula:
  - `teachers * 0.45 + schools * 0.20 + divisions * 0.15 + regional_context * 0.20`

3. High-Priority Divisions

- Primary source: `division_priority_metrics` view.
- Threshold rule: `is_high_priority = (priority_score >= 70)`.
- Priority score formula in SQL view:
  - `(100 - star_coverage_rate) * 0.30`
  - `+ specialization_mismatch_rate * 0.20`
  - `+ (100 - mentor_access_score) * 0.15`
  - `+ resource_constraint_score * 0.15`
  - `+ connectivity_constraint_score * 0.10`
  - `+ staffing_vulnerability_score * 0.10`
- KPI value: count of rows where `is_high_priority = true`.

4. Teachers Profiled

- Definition: teacher rows considered profile-complete for planning-level analysis.
- Included row criteria:
  - non-empty `teacher_code`
  - non-null `region_id`
  - non-null `division_id`
  - non-null `school_id`
- Formula: count of `teachers` rows meeting all criteria.

Header metadata rules:

- Last Updated: max timestamp from latest `regional_context.snapshot_date` and latest `upload_batches.started_at`.
- Data Quality: average `quality_score` from `v_region_data_quality_latest`.

Prototype access note:

- Migrations `0012` and `0013` intentionally allow anon/select access for dashboard-read tables and views so development environments can show real Supabase-backed KPIs without requiring a signed-in session.

## Screen To Table Mapping

- Overview:
  - `regions`
  - `divisions`
  - `schools`
  - `teachers`
  - `regional_context`
  - `school_context`
  - `training_participation`
  - `recommendations`
  - `star_programs`
  - `upload_batches`
  - `v_region_data_quality_latest`
  - `division_priority_metrics`
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
  - `ingestion_batches`
  - `data_quality_issues`

## Seed Story Design

The Supabase seed story intentionally models contrast between higher-need and higher-performing regions:

- High-need focus regions with stronger constraint signals:
  - `BARMM`
  - `Region XIII - Caraga`
  - `MIMAROPA`
  - `Region VIII - Eastern Visayas`
  - `CAR`
- Contrast regions with stronger reach and better data quality:
  - `NCR`
  - `Region III - Central Luzon`

Seeded patterns include:

- all 17 regions in `regions`
- varied underserved scores and coverage in `regional_context`
- non-uniform training participation by program and region in `training_participation`
- region-specific recommendation cards in `recommendations`
- ingestion and validation variation in `data_sources`, `upload_batches`, and `validation_issues`
- quality snapshots by region in `data_quality_snapshots`

## Mock Data Removal Audit

Dashboard pages no longer define business/demo datasets inline:

- [src/app/pages/Overview.tsx](src/app/pages/Overview.tsx)
- [src/app/pages/Diagnose.tsx](src/app/pages/Diagnose.tsx)
- [src/app/pages/Advise.tsx](src/app/pages/Advise.tsx)
- [src/app/pages/DataManager.tsx](src/app/pages/DataManager.tsx)

Fallback data is centralized in one place:

- [src/features/shared/dev-seed/index.ts](src/features/shared/dev-seed/index.ts)
- [src/features/shared/dev-seed/non-dashboard.ts](src/features/shared/dev-seed/non-dashboard.ts)

The fallback is only used when Supabase is unavailable or a query fails in development mode.

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

## What Is Still Prototype-Level

- Upload action handlers in pages still show toast placeholders
- No ingestion pipeline writes CSV rows into staging tables yet
- No auth or permission enforcement in frontend

## Next For Full CSV Ingestion

1. Add upload UI to send files to Supabase Storage
2. Add ingestion worker/edge function to parse CSV and write staging tables
3. Normalize tokens using alias tables (`region_aliases`, `specialization_aliases`, `boolean_token_map`, `accepted_date_formats`)
4. Recompute quality snapshots and recommendation inputs after each batch
  