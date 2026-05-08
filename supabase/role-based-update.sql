create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('doctor', 'admin');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'doctor',
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.patients
alter column access_code set default ('HTA-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)));

create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role in ('doctor', 'admin')
  );
$$;

create or replace function public.generate_patient_access_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  if not public.is_doctor() then
    raise exception 'Doctor role required';
  end if;

  loop
    candidate := 'HTA-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (
      select 1
      from public.patients
      where access_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.get_patient_portal_profile(access_code text)
returns table (
  full_name text,
  treatment_plan text
)
language sql
security definer
set search_path = public
as $$
  select patients.full_name, patients.treatment_plan
  from public.patients
  where patients.access_code = $1
  limit 1;
$$;

alter table public.user_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.bp_reports enable row level security;
alter table public.alert_events enable row level security;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Doctors can manage their patients" on public.patients;
create policy "Doctors can manage their patients"
on public.patients
for all
to authenticated
using (doctor_id = auth.uid() and public.is_doctor())
with check (doctor_id = auth.uid() and public.is_doctor());

drop policy if exists "Doctors can read reports for their patients" on public.bp_reports;
create policy "Doctors can read reports for their patients"
on public.bp_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.patients
    where patients.id = bp_reports.patient_id
      and patients.doctor_id = auth.uid()
      and public.is_doctor()
  )
);

drop policy if exists "Doctors can read alerts for their patients" on public.alert_events;
create policy "Doctors can read alerts for their patients"
on public.alert_events
for select
to authenticated
using (
  exists (
    select 1
    from public.patients
    where patients.id = alert_events.patient_id
      and patients.doctor_id = auth.uid()
      and public.is_doctor()
  )
);

grant execute on function public.generate_patient_access_code() to authenticated;
grant execute on function public.get_patient_portal_profile(text) to anon, authenticated;
grant execute on function public.submit_patient_report(
  text,
  public.report_period,
  integer,
  integer,
  integer,
  text[],
  boolean,
  timestamptz
) to anon, authenticated;
