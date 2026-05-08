export type Language = 'fr' | 'ar';

export type View = 'home' | 'doctor' | 'patient' | 'alerts' | 'stats';

export type PatientStatus = 'stable' | 'warning' | 'critical';

export type ReadingPeriod = 'morning' | 'evening';

export type Symptom =
  | 'headache'
  | 'dizziness'
  | 'chest_pain'
  | 'shortness_breath';

export interface BPReading {
  id: string;
  patientId: string;
  period: ReadingPeriod;
  systolic: number;
  diastolic: number;
  heartRate: number;
  symptoms: Symptom[];
  treatmentTaken: boolean;
  recordedAt: string;
}

export interface Patient {
  id: string;
  code: string;
  name: string;
  age: number;
  sex: 'F' | 'M';
  phone: string;
  treatment: string;
  physician: string;
  targetSystolic: number;
  targetDiastolic: number;
  createdAt: string;
  readings: BPReading[];
}

export interface DoctorProfile {
  id: string;
  role: 'doctor' | 'admin';
  fullName: string;
}

export interface PatientPortalProfile {
  fullName: string;
  treatment: string;
}

export interface AlertAssessment {
  status: PatientStatus;
  priority: number;
  reasons: string[];
  urgent: boolean;
}

export interface NewPatientPayload {
  name: string;
  age: number;
  phone: string;
  treatment: string;
  accessCode: string;
}
