
# TALA — Teacher Analytics and Localized Action

TALA is STAR's Planning Intelligence Layer for Data-Driven Teacher Targeting, built for the START a Ton! Data & AI Innovation Challenge 2026. It helps planning teams move from fragmented records to action-ready insights by integrating datasets, diagnosing underserved areas with explainable scoring, and surfacing intervention options tied to identified needs. This repository contains the hackathon proof of concept using synthetic but realistic data and a working planner-facing interface.

## Problem

STAR planning data for science and mathematics teacher support is often fragmented across teacher records, training attendance, and regional context sources. That fragmentation slows regional targeting, weakens comparability across areas, and makes it harder to justify where support should go first. The result is delayed, uneven intervention planning for the regions that need support most.

## Solution

TALA is not a generic dashboard and not a replacement for STAR. It is planning infrastructure built for action, centered on the IDA Engine:

- Integrate: Ingest, standardize, validate, and register fragmented data into a single planning-ready view.
- Diagnose: Compute and decompose an Underserved Area Score (UAS) to rank regions and expose key gap drivers.
- Advise: Present STAR-aligned recommendations and planning scenarios as decision support for implementers.

## Key Features

- Unified teacher data workflow through Integrate (upload, clean, validate, and load CSV/XLSX datasets).
- Data quality and validation visibility (issue summaries, severity flags, and source registry completeness indicators).
- Explainable UAS diagnosis (regional ranking, score decomposition, confidence signals, and drilldowns).
- Regional planning dashboard views (priority regions, map-based selection, KPI and trend views).
- Recommendation workspace (queue, evidence context, planner notes, and intervention status updates).
- Scenario simulation in Advise (budget, trainers, slots, timeline trade-offs with prioritized vs deferred actions).

## How It Works

1. Ingest or load data via the Integrate workflow or demo datasets.
2. Validate and inspect data quality issues before load.
3. Analyze underserved regions using Diagnose and UAS-driven ranking.
4. View dashboard insights for coverage, quality, and priority signals.
5. Review STAR-aligned recommendations and evidence context.
6. Run planning simulations to test resource-constrained rollout options.

## Tech Stack

- Frontend: React 18, TypeScript, React Router, Vite 6, Tailwind CSS 4, Radix UI/shadcn-style components, Material UI, Recharts, MapLibre GL.
- Backend / Data: Supabase JavaScript client, TypeScript feature APIs, CSV/XLSX parsing and validation (`xlsx`), TSX-based demo data scripts.
- Database: Supabase PostgreSQL with versioned SQL migrations in `supabase/migrations`.
- Deployment: Vite production build output (`dist`) and Supabase-hosted data services.
- Other tools: Supabase CLI, `tsx` runner for synthetic data scripts, optional legacy Python CSV generator.

## Repository Structure

```text
TALA-project/
|- src/
|  |- app/                      # UI shell, routes, pages (Integrate/Diagnose/Advise/Settings)
|  |- features/                 # Domain modules: data-manager, diagnose, advise, overview, shared
|  |- lib/supabase/             # Supabase client + generated DB types
|  |- styles/                   # Theme and global styling
|- supabase/migrations/         # PostgreSQL schema, policies, and seed evolution
|- scripts/                     # Demo dataset generation/cleaning scripts
|- demo_uploads/                # Synthetic CSVs for prototype demos
|- guidelines/                  # Project notes and guidance
|- package.json                 # Runtime/development scripts
|- .env.example                 # Environment variable template
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase project credentials (URL and anon key)
- Optional: Supabase CLI for migration/reset workflows
- Optional: Python 3.x if using `scripts/generate_demo_csv.py`

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create `.env.local` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DATA_MANAGER_FORCE_DEMO` (optional, `true`/`false`)

You can start from `.env.example`.

### Run Locally

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Database Migration Commands

```bash
npx supabase db push
```

```bash
npx supabase db reset
```

## Demo / Prototype

https://tala-project-start.vercel.app

## Use Case / Why It Matters

For DOST-SEI planners and STAR implementers, TALA improves how priorities are set by making regional needs visible, comparable, and explainable. It supports faster planning cycles, clearer intervention rationale, and more consistent targeting across underserved regions. For local contexts, it helps direct limited training resources where expected impact is highest.

## Hackathon Scope

This repository is a hackathon prototype for the START a Ton! Data & AI Innovation Challenge 2026. It uses synthetic but realistic datasets and does not represent full national integration with live institutional systems. Production-grade interoperability, governance integration, and nationwide rollout are future work.

## Roadmap

- Integrate pilot live datasets with stronger schema contracts and source-level lineage.
- Expand UAS validation with historical benchmarking and sensitivity checks.
- Add richer planner workflows (batch actions, saved scenarios, collaborative review states).
- Strengthen governance and auditability (decision logs, policy checks, and role-aware controls).

## Responsible Use / Data Governance

- TALA is decision support for planners, not autonomous high-stakes decision-making.
- Teacher and regional data handling should follow privacy and minimization principles.
- Role-based access controls should gate data edits, approvals, and exports.
- High-stakes planning decisions should always include qualified human review.

## Team

- Melfred Bernabe 
- Sophia Marie De Vera 
- John Lloyd Legaspi 
- Roniella Gwen Capuno 
- Ethan Dreiz Baltazar 

  