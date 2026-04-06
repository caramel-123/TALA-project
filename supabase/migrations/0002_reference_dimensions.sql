-- 0002_reference_dimensions.sql
-- Core dimensions, user profile, and timestamp trigger helpers.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  psgc_code text not null unique,
  region_name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.regions is 'Region reference list used across all data modules.';
comment on column public.regions.psgc_code is 'PSGC code for region-level geographic identification.';
comment on column public.regions.region_name is 'Canonical region name shown in dashboards.';

create trigger trg_regions_updated_at
before update on public.regions
for each row
execute function public.set_updated_at();

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  division_code text not null unique,
  division_name text not null,
  region_id uuid not null references public.regions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_name, region_id)
);

comment on table public.divisions is 'Administrative school divisions under each region.';
comment on column public.divisions.division_code is 'Division code used in uploaded datasets.';
comment on column public.divisions.region_id is 'FK to parent region scope.';

create index if not exists idx_divisions_region_id on public.divisions(region_id);

create trigger trg_divisions_updated_at
before update on public.divisions
for each row
execute function public.set_updated_at();

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  school_id_code text not null unique,
  school_name text not null,
  division_id uuid not null references public.divisions(id) on delete cascade,
  is_remote boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.schools is 'School dimension used for uploaded teacher and infrastructure records.';
comment on column public.schools.is_remote is 'True when school is classified as hard-to-reach/remote.';

create index if not exists idx_schools_division_id on public.schools(division_id);

create trigger trg_schools_updated_at
before update on public.schools
for each row
execute function public.set_updated_at();

create table if not exists public.app_users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  full_name text,
  region_id uuid references public.regions(id) on delete set null,
  division_id uuid references public.divisions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_scope_consistency
    check (
      (role in ('national_admin', 'data_steward') and region_id is null and division_id is null)
      or (role in ('regional_implementer', 'viewer') and region_id is not null)
    )
);

comment on table public.app_users_profile is 'Application role and scope mapping for authenticated users.';
comment on column public.app_users_profile.role is 'App-specific role used by RLS policies.';

create index if not exists idx_app_users_profile_region_id on public.app_users_profile(region_id);

create trigger trg_app_users_profile_updated_at
before update on public.app_users_profile
for each row
execute function public.set_updated_at();
