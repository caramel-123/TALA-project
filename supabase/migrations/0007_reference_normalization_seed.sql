-- 0007_reference_normalization_seed.sql
-- Reference mappings for messy uploads and normalization in ingestion pipelines.

create table if not exists public.region_aliases (
  id uuid primary key default gen_random_uuid(),
  alias citext not null unique,
  canonical_region_id uuid not null references public.regions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.region_aliases is 'Accepted region text aliases mapped to canonical region records.';
comment on column public.region_aliases.alias is 'Alias value as seen in uploaded files.';

drop trigger if exists trg_region_aliases_updated_at on public.region_aliases;
create trigger trg_region_aliases_updated_at
before update on public.region_aliases
for each row
execute function public.set_updated_at();

create table if not exists public.specialization_aliases (
  id uuid primary key default gen_random_uuid(),
  alias citext not null unique,
  canonical_specialization text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.specialization_aliases is 'Specialization text aliases mapped to canonical labels.';

drop trigger if exists trg_specialization_aliases_updated_at on public.specialization_aliases;
create trigger trg_specialization_aliases_updated_at
before update on public.specialization_aliases
for each row
execute function public.set_updated_at();

create table if not exists public.boolean_token_map (
  token citext primary key,
  normalized_value boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.boolean_token_map is 'Boolean-like tokens used in uploads and their normalized boolean value.';

drop trigger if exists trg_boolean_token_map_updated_at on public.boolean_token_map;
create trigger trg_boolean_token_map_updated_at
before update on public.boolean_token_map
for each row
execute function public.set_updated_at();

create table if not exists public.accepted_date_formats (
  id uuid primary key default gen_random_uuid(),
  format_label text not null unique,
  postgres_pattern text not null,
  example_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accepted_date_formats is 'Date input formats accepted by ingestion parsers for CSV uploads.';

drop trigger if exists trg_accepted_date_formats_updated_at on public.accepted_date_formats;
create trigger trg_accepted_date_formats_updated_at
before update on public.accepted_date_formats
for each row
execute function public.set_updated_at();

with region_alias_source as (
  select *
  from (
    values
      ('NCR', '130000000'),
      ('National Capital Region', '130000000'),
      ('Metro Manila', '130000000'),
      ('Region IV-A', '040000000'),
      ('CALABARZON', '040000000'),
      ('Calabarzon', '040000000'),
      ('Region XII', '120000000'),
      ('SOCCSKSARGEN', '120000000'),
      ('Region 12', '120000000'),
      ('BARMM', '190000000'),
      ('Bangsamoro', '190000000'),
      ('Bangsamoro Autonomous Region', '190000000')
  ) as v(alias, region_psgc)
),
region_alias_dedup as (
  select distinct on (lower(alias))
    alias,
    region_psgc
  from region_alias_source
  order by lower(alias), alias
)
insert into public.region_aliases (alias, canonical_region_id)
select d.alias, r.id
from region_alias_dedup d
join public.regions r on r.psgc_code = d.region_psgc
on conflict (alias) do update
set canonical_region_id = excluded.canonical_region_id;

insert into public.specialization_aliases (alias, canonical_specialization)
values
  ('Sci', 'Science'),
  ('Science', 'Science'),
  ('General Science', 'Science'),
  ('Math', 'Mathematics'),
  ('Mathematics', 'Mathematics'),
  ('Gen Math', 'Mathematics'),
  ('Gen Ed', 'General Education'),
  ('General Education', 'General Education')
on conflict (alias) do update
set canonical_specialization = excluded.canonical_specialization;

with boolean_token_source as (
  select *
  from (
    values
      ('yes', true),
      ('Yes', true),
      ('Y', true),
      ('no', false),
      ('No', false),
      ('N', false)
  ) as v(token, normalized_value)
),
boolean_token_dedup as (
  select distinct on (lower(token))
    token,
    normalized_value
  from boolean_token_source
  order by lower(token), token
)
insert into public.boolean_token_map (token, normalized_value)
select token, normalized_value
from boolean_token_dedup
on conflict (token) do update
set normalized_value = excluded.normalized_value;

insert into public.accepted_date_formats (format_label, postgres_pattern, example_value)
values
  ('YYYY-MM-DD', 'YYYY-MM-DD', '2026-04-06'),
  ('MM/DD/YYYY', 'MM/DD/YYYY', '04/06/2026'),
  ('DD-MON-YYYY', 'DD-MON-YYYY', '06-APR-2026'),
  ('MON DD, YYYY', 'Mon DD, YYYY', 'Apr 06, 2026'),
  ('YYYY/MM/DD', 'YYYY/MM/DD', '2026/04/06')
on conflict (format_label) do update
set
  postgres_pattern = excluded.postgres_pattern,
  example_value = excluded.example_value;
