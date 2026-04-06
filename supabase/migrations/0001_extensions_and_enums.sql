-- 0001_extensions_and_enums.sql
-- Base extensions and enums for TALA data platform.

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'dataset_status'
  ) then
    create type public.dataset_status as enum (
      'pending_review',
      'validated',
      'flagged',
      'rejected'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'issue_severity'
  ) then
    create type public.issue_severity as enum (
      'low',
      'moderate',
      'high'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'issue_type'
  ) then
    create type public.issue_type as enum (
      'missing_required_field',
      'duplicate_record',
      'format_mismatch',
      'out_of_range_value',
      'provenance_conflict'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'source_type'
  ) then
    create type public.source_type as enum (
      'teacher_records',
      'training_data',
      'infrastructure',
      'geographic_data'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'app_role'
  ) then
    create type public.app_role as enum (
      'national_admin',
      'data_steward',
      'regional_implementer',
      'viewer'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'validation_action_type'
  ) then
    create type public.validation_action_type as enum (
      'accept_with_flag',
      'return_to_submitter',
      'auto_correct'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'recency_label'
  ) then
    create type public.recency_label as enum (
      'Current',
      'Recent',
      'Outdated'
    );
  end if;
end $$;
