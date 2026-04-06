-- 0001_extensions_and_enums.sql
-- Base extensions and enums for TALA data platform.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.dataset_status as enum (
  'pending_review',
  'validated',
  'flagged',
  'rejected'
);

create type public.issue_severity as enum (
  'low',
  'moderate',
  'high'
);

create type public.issue_type as enum (
  'missing_required_field',
  'duplicate_record',
  'format_mismatch',
  'out_of_range_value',
  'provenance_conflict'
);

create type public.source_type as enum (
  'teacher_records',
  'training_data',
  'infrastructure',
  'geographic_data'
);

create type public.app_role as enum (
  'national_admin',
  'data_steward',
  'regional_implementer',
  'viewer'
);

create type public.validation_action_type as enum (
  'accept_with_flag',
  'return_to_submitter',
  'auto_correct'
);

create type public.recency_label as enum (
  'Current',
  'Recent',
  'Outdated'
);
