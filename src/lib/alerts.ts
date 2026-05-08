import type { AlertAssessment, BPReading, Patient, PatientStatus } from '../types';

export const statusOrder: Record<PatientStatus, number> = {
  critical: 0,
  warning: 1,
  stable: 2
};

export const sortReadings = (readings: BPReading[]) =>
  [...readings].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

export const latestReading = (patient: Patient) =>
  sortReadings(patient.readings).at(-1);

export const recentReadings = (patient: Patient, limit = 8) =>
  sortReadings(patient.readings).slice(-limit);

export const averageBP = (patient: Patient) => {
  if (!patient.readings.length) {
    return { systolic: 0, diastolic: 0 };
  }

  const totals = patient.readings.reduce(
    (sum, item) => ({
      systolic: sum.systolic + item.systolic,
      diastolic: sum.diastolic + item.diastolic
    }),
    { systolic: 0, diastolic: 0 }
  );

  return {
    systolic: Math.round(totals.systolic / patient.readings.length),
    diastolic: Math.round(totals.diastolic / patient.readings.length)
  };
};

export const adherenceRate = (patient: Patient) => {
  const readings = recentReadings(patient, 14);
  if (!readings.length) {
    return 0;
  }

  const taken = readings.filter((item) => item.treatmentTaken).length;
  return Math.round((taken / readings.length) * 100);
};

export const systolicVariability = (patient: Patient) => {
  const readings = recentReadings(patient, 14);
  if (readings.length < 2) {
    return 0;
  }

  const mean =
    readings.reduce((sum, item) => sum + item.systolic, 0) / readings.length;
  const variance =
    readings.reduce((sum, item) => sum + Math.pow(item.systolic - mean, 2), 0) /
    readings.length;

  return Math.round(Math.sqrt(variance));
};

export const classifyPatient = (patient: Patient): AlertAssessment => {
  const latest = latestReading(patient);
  const recent = recentReadings(patient, 6);
  const adherence = adherenceRate(patient);

  if (!latest) {
    return {
      status: 'stable',
      priority: 3,
      reasons: ['controlled'],
      urgent: false
    };
  }

  const reasons: string[] = [];
  const severeBP = latest.systolic > 180 || latest.diastolic > 110;
  const urgentSymptom =
    latest.symptoms.includes('chest_pain') ||
    latest.symptoms.includes('shortness_breath');

  if (severeBP) {
    reasons.push('severe_bp');
  }

  if (latest.symptoms.includes('chest_pain')) {
    reasons.push('chest_pain');
  }

  if (latest.symptoms.includes('shortness_breath')) {
    reasons.push('dyspnea');
  }

  if (severeBP || urgentSymptom) {
    return {
      status: 'critical',
      priority: 0,
      reasons,
      urgent: true
    };
  }

  const elevatedCount = recent.filter(
    (item) => item.systolic > 160 || item.diastolic > 100
  ).length;
  const minorSymptoms = latest.symptoms.some((symptom) =>
    ['headache', 'dizziness'].includes(symptom)
  );

  if (elevatedCount >= 2) {
    reasons.push('repeated_elevated');
  }

  if (minorSymptoms) {
    reasons.push('minor_symptoms');
  }

  if (adherence < 80) {
    reasons.push('poor_adherence');
  }

  if (reasons.length) {
    return {
      status: 'warning',
      priority: 1,
      reasons,
      urgent: false
    };
  }

  return {
    status: 'stable',
    priority: 2,
    reasons: ['controlled'],
    urgent: false
  };
};

export const sortPatientsByPriority = (patients: Patient[]) =>
  [...patients].sort((a, b) => {
    const aAssessment = classifyPatient(a);
    const bAssessment = classifyPatient(b);
    if (aAssessment.priority !== bAssessment.priority) {
      return aAssessment.priority - bAssessment.priority;
    }

    return (
      new Date(latestReading(b)?.recordedAt ?? b.createdAt).getTime() -
      new Date(latestReading(a)?.recordedAt ?? a.createdAt).getTime()
    );
  });

export const chartDataForPatient = (patient: Patient) =>
  sortReadings(patient.readings).map((item) => ({
    date: new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short'
    }).format(new Date(item.recordedAt)),
    systolic: item.systolic,
    diastolic: item.diastolic,
    heartRate: item.heartRate
  }));

export const clinicSummary = (patients: Patient[]) => {
  const classified = patients.map((patient) => classifyPatient(patient).status);
  const stable = classified.filter((status) => status === 'stable').length;
  const warning = classified.filter((status) => status === 'warning').length;
  const critical = classified.filter((status) => status === 'critical').length;
  const adherence =
    patients.reduce((sum, patient) => sum + adherenceRate(patient), 0) /
    Math.max(patients.length, 1);

  return {
    stable,
    warning,
    critical,
    averageAdherence: Math.round(adherence),
    controlledRate: Math.round((stable / Math.max(patients.length, 1)) * 100)
  };
};
