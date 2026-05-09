# TensioCare HTA

Modern MVP for continuous intelligent hypertension follow-up. It includes a bilingual French/Arabic frontend, Supabase doctor authentication, role-based doctor dashboard, code-only patient daily report, clinical alert center, statistics, and Supabase-ready schema.

## Run locally

```bash
npm install
npm run dev
```

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env` and set:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Doctor roles

The doctor area requires a Supabase Auth user and a matching `user_profiles` row with role `doctor` or `admin`.

After creating a doctor in Supabase Auth, add the profile row in SQL:

```sql
insert into public.user_profiles (id, role, full_name)
values ('AUTH_USER_UUID_HERE', 'doctor', 'Dr Clinic Name')
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name;
```

If you already ran the previous schema, run `supabase/role-based-update.sql` once in the Supabase SQL editor.

For a clean rebuild, create the Auth user `doctor@clinic.hta` / `demo-clinic`, then run `supabase/reset-from-scratch.sql`.

To add Moroccan demo patients after the reset, run:

```text
supabase/seed-moroccan-demo-data.sql
```

If your database already exists and you only need the new lifestyle fields for patient reports, run:

```text
supabase/add-lifestyle-fields.sql
```

## Patient access

Patients do not log in and do not see clinic statistics. A doctor creates a patient profile, clicks `Generer` / `توليد` to create a unique code, and gives only that code to the patient.

## Clinical alert logic

- Red alert: BP above `180/110`, chest pain, or shortness of breath.
- Orange alert: repeated BP above `160/100`, minor symptoms, or adherence below `80%`.
- Green status: controlled BP, no symptoms, good adherence.
