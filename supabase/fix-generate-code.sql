-- Fix patient-code generation for existing databases.
-- This removes the fragile role check from the RPC; patient creation is still
-- protected by authenticated RLS on public.patients.

create or replace function public.generate_patient_access_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
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

grant execute on function public.generate_patient_access_code() to authenticated;
