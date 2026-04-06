-- 0013_dashboard_public_read_policies.sql
-- Ensure anon/authenticated dashboard clients can read operational planning tables.

alter table public.star_programs enable row level security;
alter table public.teachers enable row level security;
alter table public.training_participation enable row level security;
alter table public.school_context enable row level security;
alter table public.regional_context enable row level security;
alter table public.recommendations enable row level security;

drop policy if exists star_programs_select_public on public.star_programs;
create policy star_programs_select_public on public.star_programs
for select to anon, authenticated
using (true);

drop policy if exists teachers_select_public on public.teachers;
create policy teachers_select_public on public.teachers
for select to anon, authenticated
using (true);

drop policy if exists training_participation_select_public on public.training_participation;
create policy training_participation_select_public on public.training_participation
for select to anon, authenticated
using (true);

drop policy if exists school_context_select_public on public.school_context;
create policy school_context_select_public on public.school_context
for select to anon, authenticated
using (true);

drop policy if exists regional_context_select_public on public.regional_context;
create policy regional_context_select_public on public.regional_context
for select to anon, authenticated
using (true);

drop policy if exists recommendations_select_public on public.recommendations;
create policy recommendations_select_public on public.recommendations
for select to anon, authenticated
using (true);
