create extension if not exists pgcrypto;

create type public.app_role as enum ('doctor', 'admin');
create type public.patient_status as enum ('stable', 'warning', 'critical');
create type public.report_period as enum ('morning', 'evening');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'doctor',
  full_name text,
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  age integer check (age between 18 and 115),
  phone text,
  access_code text not null unique default ('HTA-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6))),
  target_systolic integer not null default 140,
  target_diastolic integer not null default 90,
  treatment_plan text,
  status public.patient_status not null default 'stable',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bp_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  period public.report_period not null,
  systolic integer not null check (systolic between 70 and 260),
  diastolic integer not null check (diastolic between 40 and 160),
  heart_rate integer not null check (heart_rate between 30 and 220),
  symptoms text[] not null default '{}',
  treatment_taken boolean not null default true,
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.alert_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  report_id uuid references public.bp_reports(id) on delete set null,
  severity public.patient_status not null,
  reason text not null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index bp_reports_patient_reported_idx
  on public.bp_reports (patient_id, reported_at desc);

create index alert_events_patient_created_idx
  on public.alert_events (patient_id, created_at desc);

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

create or replace function public.evaluate_hta_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  elevated_count integer := 0;
  next_status public.patient_status := 'stable';
  alert_reason text := 'Controlled blood pressure';
begin
  select count(*)
    into elevated_count
  from public.bp_reports
  where patient_id = new.patient_id
    and reported_at >= now() - interval '7 days'
    and (systolic > 160 or diastolic > 100);

  if new.systolic > 180 or new.diastolic > 110 then
    next_status := 'critical';
    alert_reason := 'BP > 180/110';
  elsif 'chest_pain' = any(new.symptoms) then
    next_status := 'critical';
    alert_reason := 'Chest pain reported';
  elsif 'shortness_breath' = any(new.symptoms) then
    next_status := 'critical';
    alert_reason := 'Dyspnea reported';
  elsif elevated_count >= 2 then
    next_status := 'warning';
    alert_reason := 'Repeated BP > 160/100';
  elsif new.treatment_taken = false then
    next_status := 'warning';
    alert_reason := 'Treatment not taken';
  elsif array_length(new.symptoms, 1) > 0 then
    next_status := 'warning';
    alert_reason := 'Symptoms reported';
  end if;

  update public.patients
     set status = next_status,
         updated_at = now()
   where id = new.patient_id;

  if next_status <> 'stable' then
    insert into public.alert_events (patient_id, report_id, severity, reason)
    values (new.patient_id, new.id, next_status, alert_reason);
  end if;

  return new;
end;
$$;

create trigger bp_reports_evaluate_hta_report
after insert on public.bp_reports
for each row execute function public.evaluate_hta_report();

create or replace function public.submit_patient_report(
  access_code text,
  reading_period public.report_period,
  systolic integer,
  diastolic integer,
  heart_rate integer,
  symptoms text[] default '{}',
  treatment_taken boolean default true,
  reported_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_patient uuid;
  inserted_report uuid;
begin
  select id
    into target_patient
  from public.patients
  where patients.access_code = submit_patient_report.access_code;

  if target_patient is null then
    raise exception 'Unknown patient access code';
  end if;

  insert into public.bp_reports (
    patient_id,
    period,
    systolic,
    diastolic,
    heart_rate,
    symptoms,
    treatment_taken,
    reported_at
  )
  values (
    target_patient,
    reading_period,
    systolic,
    diastolic,
    heart_rate,
    symptoms,
    treatment_taken,
    reported_at
  )
  returning id into inserted_report;

  return inserted_report;
end;
$$;

alter table public.patients enable row level security;
alter table public.bp_reports enable row level security;
alter table public.alert_events enable row level security;
alter table public.user_profiles enable row level security;

create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

create policy "Doctors can manage their patients"
on public.patients
for all
to authenticated
using (doctor_id = auth.uid() and public.is_doctor())
with check (doctor_id = auth.uid() and public.is_doctor());

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
