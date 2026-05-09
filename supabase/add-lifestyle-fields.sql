-- Adds lifestyle fields to daily BP reports without deleting existing data.
-- Run this once on an existing database after pulling this app update.

alter table public.bp_reports
add column if not exists physical_activity text not null default 'none';

alter table public.bp_reports
add column if not exists tobacco_use text not null default 'non_smoker';

alter table public.bp_reports
add column if not exists alcohol_use text not null default 'none';

alter table public.bp_reports
add column if not exists diet_quality text not null default 'medium';

alter table public.bp_reports
drop constraint if exists bp_reports_physical_activity_check;

alter table public.bp_reports
add constraint bp_reports_physical_activity_check
check (physical_activity in ('none', 'walk_lt_30', 'walk_gt_30', 'sport'));

alter table public.bp_reports
drop constraint if exists bp_reports_tobacco_use_check;

alter table public.bp_reports
add constraint bp_reports_tobacco_use_check
check (tobacco_use in ('non_smoker', 'cig_1_10', 'cig_gt_10'));

alter table public.bp_reports
drop constraint if exists bp_reports_alcohol_use_check;

alter table public.bp_reports
add constraint bp_reports_alcohol_use_check
check (alcohol_use in ('none', 'drinks_1_2', 'drinks_gt_2'));

alter table public.bp_reports
drop constraint if exists bp_reports_diet_quality_check;

alter table public.bp_reports
add constraint bp_reports_diet_quality_check
check (diet_quality in ('good', 'medium', 'poor'));

drop function if exists public.submit_patient_report(
  text,
  public.report_period,
  integer,
  integer,
  integer,
  text[],
  boolean,
  timestamptz
) cascade;

drop function if exists public.submit_patient_report(
  text,
  public.report_period,
  integer,
  integer,
  integer,
  text[],
  boolean,
  text,
  text,
  text,
  text,
  timestamptz
) cascade;

create or replace function public.submit_patient_report(
  access_code text,
  reading_period public.report_period,
  systolic integer,
  diastolic integer,
  heart_rate integer,
  symptoms text[] default '{}',
  treatment_taken boolean default true,
  physical_activity text default 'none',
  tobacco_use text default 'non_smoker',
  alcohol_use text default 'none',
  diet_quality text default 'medium',
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
    physical_activity,
    tobacco_use,
    alcohol_use,
    diet_quality,
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
    physical_activity,
    tobacco_use,
    alcohol_use,
    diet_quality,
    reported_at
  )
  returning id into inserted_report;

  return inserted_report;
end;
$$;

grant execute on function public.submit_patient_report(
  text,
  public.report_period,
  integer,
  integer,
  integer,
  text[],
  boolean,
  text,
  text,
  text,
  text,
  timestamptz
) to anon, authenticated;
