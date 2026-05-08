-- Seed Moroccan example patients for TensioCare HTA.
-- Run this after reset-from-scratch.sql.
-- Required Auth user:
--   Email: doctor@clinic.hta
--   Password: demo-clinic

do $$
declare
  doctor_user_id uuid;
  patient_ahmed uuid;
  patient_fatima uuid;
  patient_abdelkader uuid;
  patient_aicha uuid;
  patient_youssef uuid;
  patient_meryem uuid;
begin
  select id
    into doctor_user_id
  from auth.users
  where lower(email) = lower('doctor@clinic.hta')
  limit 1;

  if doctor_user_id is null then
    raise exception 'Create the Supabase Auth user doctor@clinic.hta before seeding demo data.';
  end if;

  insert into public.user_profiles (id, role, full_name)
  values (doctor_user_id, 'doctor', 'Dr Clinic HTA')
  on conflict (id) do update
  set role = excluded.role,
      full_name = excluded.full_name;

  delete from public.patients
  where doctor_id = doctor_user_id
    and access_code in (
      'HTA-7429',
      'HTA-3184',
      'HTA-9061',
      'HTA-2256',
      'HTA-6402',
      'HTA-5108'
    );

  insert into public.patients (
    doctor_id,
    full_name,
    age,
    phone,
    access_code,
    target_systolic,
    target_diastolic,
    treatment_plan
  )
  values (
    doctor_user_id,
    'Ahmed El Mansouri',
    67,
    '+212 6 11 42 88 09',
    'HTA-7429',
    140,
    90,
    'Amlodipine 5 mg + Hydrochlorothiazide 12.5 mg'
  )
  returning id into patient_ahmed;

  insert into public.patients (
    doctor_id,
    full_name,
    age,
    phone,
    access_code,
    target_systolic,
    target_diastolic,
    treatment_plan
  )
  values (
    doctor_user_id,
    'Fatima Benkirane',
    59,
    '+212 6 72 14 09 34',
    'HTA-3184',
    135,
    85,
    'Perindopril 5 mg'
  )
  returning id into patient_fatima;

  insert into public.patients (
    doctor_id,
    full_name,
    age,
    phone,
    access_code,
    target_systolic,
    target_diastolic,
    treatment_plan
  )
  values (
    doctor_user_id,
    'Abdelkader El Fassi',
    72,
    '+212 6 38 55 21 70',
    'HTA-9061',
    140,
    90,
    'Losartan 50 mg'
  )
  returning id into patient_abdelkader;

  insert into public.patients (
    doctor_id,
    full_name,
    age,
    phone,
    access_code,
    target_systolic,
    target_diastolic,
    treatment_plan
  )
  values (
    doctor_user_id,
    'Aicha Zahraoui',
    63,
    '+212 6 94 33 18 20',
    'HTA-2256',
    135,
    85,
    'Valsartan 80 mg + Amlodipine 5 mg'
  )
  returning id into patient_aicha;

  insert into public.patients (
    doctor_id,
    full_name,
    age,
    phone,
    access_code,
    target_systolic,
    target_diastolic,
    treatment_plan
  )
  values (
    doctor_user_id,
    'Youssef Idrissi',
    74,
    '+212 6 39 52 80 41',
    'HTA-6402',
    140,
    90,
    'Ramipril 10 mg'
  )
  returning id into patient_youssef;

  insert into public.patients (
    doctor_id,
    full_name,
    age,
    phone,
    access_code,
    target_systolic,
    target_diastolic,
    treatment_plan
  )
  values (
    doctor_user_id,
    'Meryem Alaoui',
    56,
    '+212 6 18 55 74 32',
    'HTA-5108',
    135,
    85,
    'Indapamide 1.5 mg'
  )
  returning id into patient_meryem;

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
  values
    -- Ahmed El Mansouri: critical, severe hypertension + chest pain.
    (patient_ahmed, 'morning', 148, 92, 76, '{}', true, now() - interval '6 days 8 hours'),
    (patient_ahmed, 'evening', 155, 96, 79, '{}', true, now() - interval '5 days 20 hours'),
    (patient_ahmed, 'morning', 162, 100, 83, array['headache'], true, now() - interval '4 days 8 hours'),
    (patient_ahmed, 'evening', 168, 102, 84, array['dizziness'], true, now() - interval '3 days 20 hours'),
    (patient_ahmed, 'morning', 176, 106, 88, array['headache'], true, now() - interval '1 day 8 hours'),
    (patient_ahmed, 'evening', 188, 114, 96, array['chest_pain'], true, now() - interval '2 hours'),

    -- Fatima Benkirane: warning, repeated BP > 160/100 and missed treatment.
    (patient_fatima, 'morning', 149, 92, 73, '{}', true, now() - interval '6 days 8 hours'),
    (patient_fatima, 'evening', 158, 96, 76, '{}', true, now() - interval '5 days 20 hours'),
    (patient_fatima, 'morning', 161, 101, 78, '{}', false, now() - interval '4 days 8 hours'),
    (patient_fatima, 'evening', 164, 99, 80, array['dizziness'], true, now() - interval '3 days 20 hours'),
    (patient_fatima, 'morning', 159, 98, 81, '{}', false, now() - interval '1 day 8 hours'),
    (patient_fatima, 'morning', 166, 102, 82, array['headache'], true, now() - interval '3 hours'),

    -- Abdelkader El Fassi: stable, controlled BP and good adherence.
    (patient_abdelkader, 'morning', 131, 78, 67, '{}', true, now() - interval '6 days 8 hours'),
    (patient_abdelkader, 'evening', 127, 76, 65, '{}', true, now() - interval '5 days 20 hours'),
    (patient_abdelkader, 'morning', 134, 81, 68, '{}', true, now() - interval '4 days 8 hours'),
    (patient_abdelkader, 'evening', 129, 77, 66, '{}', true, now() - interval '3 days 20 hours'),
    (patient_abdelkader, 'morning', 132, 79, 67, '{}', true, now() - interval '1 day 8 hours'),
    (patient_abdelkader, 'morning', 128, 78, 66, '{}', true, now() - interval '4 hours'),

    -- Aicha Zahraoui: warning, adherence issue + dizziness.
    (patient_aicha, 'morning', 142, 88, 72, '{}', false, now() - interval '6 days 8 hours'),
    (patient_aicha, 'evening', 151, 92, 74, '{}', false, now() - interval '5 days 20 hours'),
    (patient_aicha, 'morning', 147, 90, 76, array['headache'], true, now() - interval '4 days 8 hours'),
    (patient_aicha, 'evening', 153, 94, 77, '{}', false, now() - interval '3 days 20 hours'),
    (patient_aicha, 'morning', 150, 93, 75, '{}', true, now() - interval '1 day 8 hours'),
    (patient_aicha, 'evening', 154, 95, 78, array['dizziness'], false, now() - interval '1 hour'),

    -- Youssef Idrissi: critical, dyspnea.
    (patient_youssef, 'morning', 151, 92, 70, '{}', true, now() - interval '6 days 8 hours'),
    (patient_youssef, 'evening', 156, 94, 72, '{}', true, now() - interval '5 days 20 hours'),
    (patient_youssef, 'morning', 160, 98, 78, array['headache'], true, now() - interval '4 days 8 hours'),
    (patient_youssef, 'evening', 167, 103, 80, '{}', true, now() - interval '3 days 20 hours'),
    (patient_youssef, 'morning', 171, 104, 82, array['shortness_breath'], true, now() - interval '1 day 8 hours'),
    (patient_youssef, 'morning', 178, 106, 90, array['shortness_breath'], true, now() - interval '30 minutes'),

    -- Meryem Alaoui: stable.
    (patient_meryem, 'morning', 126, 79, 64, '{}', true, now() - interval '6 days 8 hours'),
    (patient_meryem, 'evening', 132, 82, 66, '{}', true, now() - interval '5 days 20 hours'),
    (patient_meryem, 'morning', 130, 81, 65, '{}', true, now() - interval '4 days 8 hours'),
    (patient_meryem, 'evening', 136, 84, 67, '{}', true, now() - interval '3 days 20 hours'),
    (patient_meryem, 'morning', 129, 80, 64, '{}', true, now() - interval '1 day 8 hours'),
    (patient_meryem, 'evening', 133, 83, 66, '{}', true, now() - interval '45 minutes');
end;
$$;

select
  full_name,
  access_code,
  status,
  treatment_plan
from public.patients
where access_code in (
  'HTA-7429',
  'HTA-3184',
  'HTA-9061',
  'HTA-2256',
  'HTA-6402',
  'HTA-5108'
)
order by full_name;
