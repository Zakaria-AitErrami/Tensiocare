import { createClient } from '@supabase/supabase-js';
import type {
  BPReading,
  DoctorProfile,
  LifestyleReport,
  NewPatientPayload,
  Patient,
  PatientPortalProfile,
  Symptom
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
};

const mapReading = (row: Record<string, unknown>): BPReading => ({
  id: String(row.id),
  patientId: String(row.patient_id),
  period: row.period as BPReading['period'],
  systolic: Number(row.systolic),
  diastolic: Number(row.diastolic),
  heartRate: Number(row.heart_rate),
  symptoms: ((row.symptoms as string[] | null) ?? []) as Symptom[],
  treatmentTaken: Boolean(row.treatment_taken),
  recordedAt: String(row.reported_at),
  physicalActivity: (row.physical_activity as LifestyleReport['physicalActivity'] | null) ?? 'none',
  tobaccoUse: (row.tobacco_use as LifestyleReport['tobaccoUse'] | null) ?? 'non_smoker',
  alcoholUse: (row.alcohol_use as LifestyleReport['alcoholUse'] | null) ?? 'none',
  dietQuality: (row.diet_quality as LifestyleReport['dietQuality'] | null) ?? 'medium'
});

const mapPatient = (row: Record<string, unknown>): Patient => ({
  id: String(row.id),
  code: String(row.access_code),
  name: String(row.full_name),
  age: Number(row.age ?? 0),
  sex: 'F',
  phone: String(row.phone ?? ''),
  treatment: String(row.treatment_plan ?? ''),
  physician: '',
  targetSystolic: Number(row.target_systolic ?? 140),
  targetDiastolic: Number(row.target_diastolic ?? 90),
  createdAt: String(row.created_at),
  readings: (((row.bp_reports as Record<string, unknown>[] | null) ?? [])
    .map(mapReading)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    ))
});

export const getCurrentDoctor = async (): Promise<DoctorProfile | null> => {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const userId = sessionData.session?.user.id;
  if (!userId) {
    return null;
  }

  const { data, error } = await client
    .from('user_profiles')
    .select('id, role, full_name')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('This Supabase user does not have a doctor profile.');
    }

    throw error;
  }

  if (data.role !== 'doctor' && data.role !== 'admin') {
    throw new Error('This account is not authorized as a doctor.');
  }

  return {
    id: data.id,
    role: data.role,
    fullName: data.full_name ?? ''
  };
};

export const signInDoctor = async (
  email: string,
  password: string
): Promise<DoctorProfile> => {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  const profile = await getCurrentDoctor();
  if (!profile) {
    throw new Error('No active doctor session.');
  }

  return profile;
};

export const signOutDoctor = async () => {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
};

export const fetchDoctorPatients = async (): Promise<Patient[]> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('patients')
    .select(
      `
        id,
        full_name,
        age,
        phone,
        access_code,
        target_systolic,
        target_diastolic,
        treatment_plan,
        created_at,
        bp_reports (
          id,
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
      `
    )
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapPatient(row));
};

export const generateUniqueAccessCode = async (): Promise<string> => {
  const client = requireSupabase();
  const { data, error } = await client.rpc('generate_patient_access_code');

  if (error) {
    console.warn('Supabase code generation failed, using client fallback.', error);
    return generateLocalAccessCode();
  }

  return data ? String(data) : generateLocalAccessCode();
};

const generateLocalAccessCode = () => {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  return `HTA-${suffix}`;
};

export const insertPatientProfile = async (
  payload: NewPatientPayload
): Promise<Patient> => {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  const doctorId = userData.user?.id;
  if (!doctorId) {
    throw new Error('Doctor session required.');
  }

  const { data, error } = await client
    .from('patients')
    .insert({
      doctor_id: doctorId,
      full_name: payload.name,
      age: payload.age,
      phone: payload.phone,
      access_code: payload.accessCode,
      treatment_plan: payload.treatment
    })
    .select(
      `
        id,
        full_name,
        age,
        phone,
        access_code,
        target_systolic,
        target_diastolic,
        treatment_plan,
        created_at,
        bp_reports (
          id,
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
      `
    )
    .single();

  if (error) {
    throw error;
  }

  return mapPatient(data);
};

export const fetchPatientPortalProfile = async (
  accessCode: string
): Promise<PatientPortalProfile | null> => {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_patient_portal_profile', {
    access_code: accessCode
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }

  return {
    fullName: row.full_name,
    treatment: row.treatment_plan ?? ''
  };
};

export const submitPatientReadingsByCode = async (
  accessCode: string,
  readings: Array<Omit<BPReading, 'id' | 'patientId'>>
) => {
  const client = requireSupabase();

  for (const item of readings) {
    const { error } = await client.rpc('submit_patient_report', {
      access_code: accessCode,
      reading_period: item.period,
      systolic: item.systolic,
      diastolic: item.diastolic,
      heart_rate: item.heartRate,
      symptoms: item.symptoms,
      treatment_taken: item.treatmentTaken,
      physical_activity: item.physicalActivity,
      tobacco_use: item.tobaccoUse,
      alcohol_use: item.alcoholUse,
      diet_quality: item.dietQuality,
      reported_at: item.recordedAt
    });

    if (error) {
      throw error;
    }
  }

  return { ok: true };
};

export const subscribeToClinicChanges = (onChange: () => void) => {
  const client = requireSupabase();
  const channel = client
    .channel('clinic-live-updates')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'patients' },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bp_reports' },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alert_events' },
      onChange
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
};
