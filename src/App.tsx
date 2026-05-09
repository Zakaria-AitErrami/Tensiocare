import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardCheck,
  HeartPulse,
  Languages,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Plus,
  ShieldCheck,
  Smartphone,
  Stethoscope
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  adherenceRate,
  averageBP,
  chartDataForPatient,
  classifyPatient,
  clinicSummary,
  latestReading,
  recentReadings,
  sortPatientsByPriority,
  systolicVariability
} from './lib/alerts';
import {
  copy,
  languages,
  lifestyleLabel,
  statusLabel,
  statusTone,
  symptomLabel,
  viewLabel
} from './lib/i18n';
import {
  fetchDoctorPatients,
  fetchPatientPortalProfile,
  generateUniqueAccessCode,
  getCurrentDoctor,
  insertPatientProfile,
  isSupabaseConfigured,
  signInDoctor,
  signOutDoctor,
  submitPatientReadingsByCode,
  subscribeToClinicChanges
} from './lib/supabase';
import type {
  BPReading,
  DoctorProfile,
  LifestyleReport,
  Language,
  NewPatientPayload,
  Patient,
  PatientPortalProfile,
  PatientStatus,
  Symptom,
  View
} from './types';

const views: View[] = ['home', 'doctor', 'patient', 'alerts', 'stats'];
const symptomOptions: Symptom[] = [
  'headache',
  'dizziness',
  'chest_pain',
  'shortness_breath'
];

const lifestyleOptions: {
  key: keyof LifestyleReport;
  values: LifestyleReport[keyof LifestyleReport][];
}[] = [
  { key: 'physicalActivity', values: ['none', 'walk_lt_30', 'walk_gt_30', 'sport'] },
  { key: 'tobaccoUse', values: ['non_smoker', 'cig_1_10', 'cig_gt_10'] },
  { key: 'alcoholUse', values: ['none', 'drinks_1_2', 'drinks_gt_2'] },
  { key: 'dietQuality', values: ['good', 'medium', 'poor'] }
];

const viewIcons: Record<View, typeof Activity> = {
  home: Activity,
  doctor: Stethoscope,
  patient: Smartphone,
  alerts: Bell,
  stats: BarChart3
};

const reasonCopy: Record<Language, Record<string, string>> = {
  fr: {
    severe_bp: 'TA superieure au seuil urgent 180/110',
    chest_pain: 'Douleur thoracique declaree',
    dyspnea: 'Dyspnee declaree',
    repeated_elevated: 'TA > 160/100 repetee',
    poor_adherence: 'Observance inferieure a 80%',
    minor_symptoms: 'Symptomes mineurs associes',
    controlled: 'TA controlee et aucun signal de risque'
  },
  ar: {
    severe_bp: 'ضغط أعلى من عتبة الخطر 180/110',
    chest_pain: 'تم التصريح بألم في الصدر',
    dyspnea: 'تم التصريح بضيق في التنفس',
    repeated_elevated: 'ارتفاع متكرر فوق 160/100',
    poor_adherence: 'التزام أقل من 80%',
    minor_symptoms: 'أعراض بسيطة مرافقة',
    controlled: 'ضغط مضبوط دون مؤشرات خطر'
  }
};

const statusColors: Record<PatientStatus, string> = {
  stable: '#13a06f',
  warning: '#f09a2a',
  critical: '#e5484d'
};
const contactEmail = 'Adaiterrami@yahoo.com';

const formatDateTime = (value: string | undefined, language: Language) => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-MA' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
};

const bpText = (reading?: BPReading) =>
  reading ? `${reading.systolic}/${reading.diastolic}` : '—';

const symptomText = (reading: BPReading | undefined, language: Language) => {
  if (!reading || reading.symptoms.length === 0) {
    return copy[language].noSymptoms;
  }

  return reading.symptoms.map((symptom) => symptomLabel[language][symptom]).join(', ');
};

const lifestyleItems = (reading: BPReading | undefined, language: Language) => {
  if (!reading) {
    return [];
  }

  return [
    {
      label: copy[language].physicalActivity,
      value: lifestyleLabel[language].physicalActivity[reading.physicalActivity]
    },
    {
      label: copy[language].tobaccoUse,
      value: lifestyleLabel[language].tobaccoUse[reading.tobaccoUse]
    },
    {
      label: copy[language].alcoholUse,
      value: lifestyleLabel[language].alcoholUse[reading.alcoholUse]
    },
    {
      label: copy[language].dietQuality,
      value: lifestyleLabel[language].dietQuality[reading.dietQuality]
    }
  ];
};

function App() {
  const bootPatientCode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('patient') ?? ''
      : '';
  const [language, setLanguage] = useState<Language>('fr');
  const [activeView, setActiveView] = useState<View>(
    bootPatientCode ? 'patient' : 'home'
  );
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [clinicLoading, setClinicLoading] = useState(false);
  const [clinicError, setClinicError] = useState('');

  const t = copy[language];
  const prioritizedPatients = useMemo(
    () => sortPatientsByPriority(patients),
    [patients]
  );
  const selectedPatient =
    patients.find((patient) => patient.id === selectedPatientId) ??
    prioritizedPatients[0];

  const loadClinic = async () => {
    if (!doctorProfile) {
      return;
    }

    setClinicLoading(true);
    setClinicError('');

    try {
      const doctorPatients = await fetchDoctorPatients();
      setPatients(doctorPatients);
      setSelectedPatientId((current) => current || doctorPatients[0]?.id || '');
    } catch (error) {
      setClinicError(error instanceof Error ? error.message : 'Unable to load clinic data.');
    } finally {
      setClinicLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || activeView === 'patient') {
      return;
    }

    void getCurrentDoctor()
      .then((profile) => {
        setDoctorProfile(profile);
      })
      .catch(() => {
        setDoctorProfile(null);
      });
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'patient') {
      return;
    }

    if (isSupabaseConfigured) {
      void signOutDoctor().catch(() => undefined);
    }

    setDoctorProfile(null);
    setPatients([]);
    setSelectedPatientId('');
    setClinicError('');
  }, [activeView]);

  useEffect(() => {
    void loadClinic();
  }, [doctorProfile]);

  useEffect(() => {
    if (!doctorProfile) {
      return undefined;
    }

    return subscribeToClinicChanges(() => {
      void loadClinic();
    });
  }, [doctorProfile]);

  const addPatient = async (payload: NewPatientPayload) => {
    const patient = await insertPatientProfile(payload);
    setPatients((current) => [patient, ...current]);
    setSelectedPatientId(patient.id);

    return patient;
  };

  const handleDoctorLogout = async () => {
    if (isSupabaseConfigured) {
      await signOutDoctor().catch(() => undefined);
    }

    setDoctorProfile(null);
    setPatients([]);
    setSelectedPatientId('');
    setClinicError('');
    setActiveView('home');
  };

  const navigateTo = (view: View) => {
    if (view === 'patient') {
      if (doctorProfile) {
        void signOutDoctor().catch(() => undefined);
      }

      setDoctorProfile(null);
      setPatients([]);
      setSelectedPatientId('');
      setClinicError('');
    }

    setActiveView(view);
  };

  return (
    <div className="app" dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language}>
      <Header
        activeView={activeView}
        language={language}
        doctorSignedIn={Boolean(doctorProfile)}
        setActiveView={navigateTo}
        setLanguage={setLanguage}
        onLogout={handleDoctorLogout}
      />

      <main>
        {activeView === 'home' && (
          <Home language={language} setActiveView={navigateTo} />
        )}
        {activeView === 'doctor' && (
          <DoctorDashboard
            language={language}
            patients={patients}
            selectedPatient={selectedPatient}
            doctorProfile={doctorProfile}
            setDoctorProfile={setDoctorProfile}
            loading={clinicLoading}
            error={clinicError}
            setSelectedPatientId={setSelectedPatientId}
            addPatient={addPatient}
          />
        )}
        {activeView === 'patient' && (
          <PatientPortal
            language={language}
            initialCode={bootPatientCode}
          />
        )}
        {activeView === 'alerts' && (
          <ProtectedDoctorView
            language={language}
            doctorProfile={doctorProfile}
            setDoctorProfile={setDoctorProfile}
          >
            <AlertCenter language={language} patients={patients} />
          </ProtectedDoctorView>
        )}
        {activeView === 'stats' && (
          <ProtectedDoctorView
            language={language}
            doctorProfile={doctorProfile}
            setDoctorProfile={setDoctorProfile}
          >
            <Statistics language={language} patients={patients} />
          </ProtectedDoctorView>
        )}
      </main>

      <footer className="footer">
        <div>
          <strong>{t.brand}</strong>
          <span>{t.footerTagline}</span>
        </div>
        <div className="footer-links">
          <button onClick={() => navigateTo('doctor')}>{t.doctorCTA}</button>
          <button onClick={() => navigateTo('patient')}>{t.patientCTA}</button>
          <a href={`mailto:${contactEmail}`}>{t.contactUs}</a>
        </div>
      </footer>
    </div>
  );
}

interface HeaderProps {
  activeView: View;
  language: Language;
  doctorSignedIn: boolean;
  setActiveView: (view: View) => void;
  setLanguage: (language: Language) => void;
  onLogout: () => void;
}

function Header({
  activeView,
  language,
  doctorSignedIn,
  setActiveView,
  setLanguage,
  onLogout
}: HeaderProps) {
  const t = copy[language];
  const availableViews = doctorSignedIn
    ? views
    : views.filter((view) => !['alerts', 'stats'].includes(view));

  return (
    <header className="topbar">
      <button className="brand-button" onClick={() => setActiveView('home')}>
        <span className="brand-mark">
          <img className="brand-logo" src="/assets/suivi-hta-logo.png" alt="" />
        </span>
        <span>
          <strong>{t.brand}</strong>
          <small>{t.tagline}</small>
        </span>
      </button>

      <nav className="main-nav" aria-label="Primary navigation">
        {availableViews.map((view) => {
          const Icon = viewIcons[view];
          return (
            <button
              key={view}
              className={`nav-link ${activeView === view ? 'active' : ''}`}
              onClick={() => setActiveView(view)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{viewLabel[language][view]}</span>
            </button>
          );
        })}
      </nav>

      <div className="topbar-actions">
        <span className={`auth-pill ${doctorSignedIn ? 'is-live' : ''}`}>
          <ShieldCheck size={16} aria-hidden="true" />
          {doctorSignedIn ? t.authenticated : t.secureAccess}
        </span>
        {doctorSignedIn && (
          <button className="logout-button" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" />
            {t.signOut}
          </button>
        )}
        <div className="language-toggle" aria-label="Language selector">
          <Languages size={16} aria-hidden="true" />
          {languages.map((item) => (
            <button
              key={item.code}
              className={language === item.code ? 'active' : ''}
              onClick={() => setLanguage(item.code)}
            >
              {item.short}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function Home({
  language,
  setActiveView
}: {
  language: Language;
  setActiveView: (view: View) => void;
}) {
  const t = copy[language];
  const isArabic = language === 'ar';
  const story = isArabic
    ? {
        title: 'متابعة ذكية ومستمرة لارتفاع ضغط الدم',
        body:
          'تساعد المنصة الأطباء والعيادات والمؤسسات الصحية على متابعة مرضى ارتفاع الضغط بطريقة بسيطة، حديثة ومستمرة، بهدف اكتشاف الاضطرابات والحالات الخطرة قبل ظهور المضاعفات.',
        patientIntro: 'كل يوم، يرسل المريض بسرعة معطياته الأساسية:',
        doctorIntro: 'تُحلل المعطيات تلقائيا حتى يتمكن الطبيب من:',
        visionTitle: 'رؤيتنا',
        vision:
          'إعادة تعريف العلاقة بين الطبيب والمريض عبر مراقبة طبية مستمرة، ذكية، وقريبة من الحياة اليومية.'
      }
    : {
        title: 'Un suivi intelligent et continu de l’hypertension artérielle',
        body:
          'Notre plateforme aide les médecins, cliniques et structures de santé à assurer un suivi simple, moderne et continu des patients atteints d’hypertension artérielle. L’objectif est de détecter précocement les déséquilibres tensionnels et les situations à risque avant l’apparition des complications.',
        patientIntro: 'Chaque jour, le patient renseigne rapidement ses paramètres essentiels :',
        doctorIntro: 'Les données sont automatiquement analysées afin de permettre au médecin de :',
        visionTitle: 'Vision',
        vision:
          'Redéfinir la relation médecin-patient grâce à une surveillance médicale continue, intelligente et accessible.'
      };
  const about = isArabic
    ? {
        kicker: 'من نحن؟',
        title: 'AtlasCare: Atlas HTA',
        body:
          'Atlas HTA هو فرع تابع لـ AtlasCare ومخصص للمتابعة الذكية لارتفاع ضغط الدم ضمن منظومة الطب المتصل والأمراض المزمنة.',
        detail:
          'تطور AtlasCare عدة مسارات رقمية للمتابعة المستمرة والشخصية، بهدف تعزيز الوقاية واستباق المضاعفات قبل الحالات المستعجلة.',
        parentLabel: 'المنظومة الأم',
        parentName: 'AtlasCare',
        parentText: 'Connected Health للأمراض المزمنة',
        childLabel: 'الفرع المتخصص',
        childName: 'Atlas HTA',
        childText: 'متابعة ذكية لارتفاع ضغط الدم',
        conditions: [
          'ارتفاع ضغط الدم',
          'السكري من النوع الثاني',
          'أمراض الروماتيزم',
          'أمراض الأمعاء الالتهابية',
          'التهابات الكبد المزمنة'
        ]
      }
    : {
        kicker: 'Qui sommes-nous ?',
        title: 'AtlasCare: Atlas HTA',
        body:
          'Atlas HTA est une filiale d’AtlasCare dédiée au suivi intelligent de l’hypertension artérielle, au sein d’un écosystème de médecine connectée pour les maladies chroniques.',
        detail:
          'AtlasCare développe un écosystème de parcours numériques permettant le suivi continu et personnalisé de plusieurs pathologies, afin d’améliorer la prévention et d’anticiper les complications avant l’urgence.',
        parentLabel: 'Maison mère',
        parentName: 'AtlasCare',
        parentText: 'Connected Health pour maladies chroniques',
        childLabel: 'Branche spécialisée',
        childName: 'Atlas HTA',
        childText: 'Suivi intelligent de l’hypertension artérielle',
        conditions: [
          'Hypertension artérielle',
          'Diabète de type 2',
          'Maladies rhumatismales',
          'MICI',
          'Hépatites chroniques'
        ]
      };
  const dailyItems = isArabic
    ? ['ضغط الدم', 'نبض القلب', 'الأعراض المحتملة', 'أخذ العلاج']
    : ['tension artérielle', 'fréquence cardiaque', 'symptômes éventuels', 'prise du traitement'];
  const doctorItems = isArabic
    ? ['تحديد المرضى الذين يحتاجون اهتماما خاصا', 'متابعة تطور الضغط في الوقت الحقيقي', 'ضمان رعاية استباقية وشخصية']
    : [
        'repérer les patients nécessitant une attention particulière',
        'suivre l’évolution tensionnelle en temps réel',
        'assurer une prise en charge proactive et personnalisée'
      ];
  const featureCards: Array<{ title: string; body: string; icon: typeof Activity }> = isArabic
    ? [
        { title: 'فرز طبي ذكي', body: 'تصنيف واضح للحالات المستقرة، التي تحتاج مراقبة، والحالات الحرجة.', icon: HeartPulse },
        { title: 'متابعة يومية سهلة', body: 'إدخال سريع ومطمئن يناسب المرضى كبار السن.', icon: Smartphone },
        { title: 'تنبيهات مبكرة', body: 'إظهار الحالات الخطرة قبل أن تتحول إلى مضاعفات.', icon: Bell },
        { title: 'رؤية سريرية منظمة', body: 'بيانات مفهومة تساعد الطبيب على اتخاذ القرار بسرعة.', icon: BarChart3 }
      ]
    : [
        { title: 'Triage médical intelligent', body: 'Classification claire des patients stables, à surveiller et critiques.', icon: HeartPulse },
        { title: 'Suivi quotidien simple', body: 'Saisie rapide, rassurante et adaptée aux patients âgés.', icon: Smartphone },
        { title: 'Alertes précoces', body: 'Priorisation des situations à risque avant les complications.', icon: Bell },
        { title: 'Vision clinique organisée', body: 'Données lisibles pour aider le médecin à décider vite.', icon: BarChart3 }
      ];
  const steps = isArabic
    ? [
        ['01', 'الطبيب ينشئ رمز المريض', 'رمز بسيط يسمح للمريض بإرسال تقريره اليومي.'],
        ['02', 'المريض يرسل القياسات', 'ضغط الصباح والمساء، النبض، الأعراض، العلاج والعادات اليومية.'],
        ['03', 'النظام يرتب الأولويات', 'القيم الخطرة تظهر أولا في لوحة الطبيب.']
      ]
    : [
        ['01', 'Le médecin crée le code patient', 'Un code simple donne accès au rapport quotidien.'],
        ['02', 'Le patient envoie ses mesures', 'TA matin/soir, pouls, symptômes, traitement et habitudes du jour.'],
        ['03', 'La plateforme priorise les risques', 'Les situations dangereuses remontent en premier sur le tableau médecin.']
      ];
  const benefitCards = isArabic
    ? [
        ['للأطباء والعيادات', 'متابعة أسرع، أولويات واضحة، وقرارات مبنية على تطور الضغط اليومي.'],
        ['للمرضى', 'تجربة بسيطة ومطمئنة بدون تعقيد، مصممة للحياة اليومية.']
      ]
    : [
        ['Pour les médecins et cliniques', 'Suivi plus rapide, priorités visibles, décisions basées sur l’évolution quotidienne.'],
        ['Pour les patients', 'Expérience simple et rassurante, sans complexité, pensée pour le quotidien.']
      ];

  return (
    <div className="home-page">
      <section className="morocco-hero">
        <div className="morocco-pattern" aria-hidden="true" />
        <div className="morocco-hero-inner">
          <div className="morocco-hero-copy">
            <span className="home-kicker">
              <HeartPulse size={18} aria-hidden="true" />
              {isArabic ? 'رعاية مستمرة لارتفاع الضغط' : 'Surveillance continue de l’HTA'}
            </span>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroBody}</p>
            <div className="hero-actions">
              <button className="primary-action morocco-primary" onClick={() => setActiveView('doctor')}>
                <Stethoscope size={19} aria-hidden="true" />
                {t.doctorCTA}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button className="secondary-action morocco-secondary" onClick={() => setActiveView('patient')}>
                <Smartphone size={19} aria-hidden="true" />
                {t.patientCTA}
              </button>
            </div>
          </div>

          <div className="morocco-visual" aria-label="Aperçu médical marocain">
            <div className="visual-photo">
              <img src="/assets/moroccan-hta-monitoring.jpeg" alt="" />
            </div>
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="about-copy">
          <span className="home-kicker">
            <ShieldCheck size={17} aria-hidden="true" />
            {about.kicker}
          </span>
          <h2>{about.title}</h2>
          <p>{about.body}</p>
          <p>{about.detail}</p>
        </div>
        <div className="about-ecosystem" aria-label={about.kicker}>
          <div className="ecosystem-node parent">
            <span>{about.parentLabel}</span>
            <strong>{about.parentName}</strong>
            <small>{about.parentText}</small>
          </div>
          <div className="ecosystem-connector" aria-hidden="true" />
          <div className="ecosystem-node child">
            <span>{about.childLabel}</span>
            <strong>{about.childName}</strong>
            <small>{about.childText}</small>
          </div>
          <div className="condition-list">
            {about.conditions.map((condition) => (
              <span key={condition}>
                <Check size={16} aria-hidden="true" />
                {condition}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="home-story">
        <div className="home-section-heading">
          <span className="home-kicker">
            <ShieldCheck size={17} aria-hidden="true" />
            {isArabic ? 'طب استباقي' : 'Médecine proactive'}
          </span>
          <h2>{story.title}</h2>
          <p>{story.body}</p>
        </div>

        <div className="story-columns">
          <div className="story-panel">
            <h3>{story.patientIntro}</h3>
            <div className="check-list">
              {dailyItems.map((item) => (
                <span key={item}>
                  <Check size={17} aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="story-panel accent">
            <h3>{story.doctorIntro}</h3>
            <div className="check-list">
              {doctorItems.map((item) => (
                <span key={item}>
                  <Check size={17} aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-features">
        <div className="feature-grid premium">
          {featureCards.map(({ title, body, icon: Icon }) => (
            <article className="premium-feature" key={title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section">
        <div className="home-section-heading compact">
          <span className="home-kicker">
            <CalendarClock size={17} aria-hidden="true" />
            {isArabic ? 'كيف تعمل المنصة' : 'Comment ça marche'}
          </span>
          <h2>{isArabic ? 'ثلاث خطوات بسيطة لمتابعة أكثر أمانا' : 'Trois gestes simples pour un suivi plus sûr'}</h2>
        </div>
        <div className="steps-grid">
          {steps.map(([number, title, body]) => (
            <article className="step-card" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="benefit-section">
        <div className="benefit-card">
          <div>
            <span className="home-kicker">
              <Stethoscope size={17} aria-hidden="true" />
              {isArabic ? 'فوائد ملموسة' : 'Bénéfices concrets'}
            </span>
            <h2>{isArabic ? 'منصة تجمع بين الوضوح الطبي ودفء المتابعة' : 'Une plateforme entre clarté médicale et proximité humaine'}</h2>
          </div>
          <div className="benefit-list">
            {benefitCards.map(([title, body]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="trust-content">
          <span className="home-kicker">
            <AlertTriangle size={17} aria-hidden="true" />
            {isArabic ? 'الثقة والكشف المبكر' : 'Confiance et détection précoce'}
          </span>
          <h2>{story.visionTitle}</h2>
          <p>{story.vision}</p>
        </div>
        <div className="trust-metrics">
          <MetricMini value="180/110" label={isArabic ? 'عتبة إنذار فورية' : 'seuil d alerte immédiat'} />
          <MetricMini value="< 1 min" label={isArabic ? 'تقرير يومي سريع' : 'rapport quotidien rapide'} />
          <MetricMini value="24/7" label={isArabic ? 'استمرارية المتابعة' : 'continuité du suivi'} />
        </div>
      </section>

      <section className="contact-section">
        <div>
          <span className="home-kicker">
            <Mail size={17} aria-hidden="true" />
            {t.contactUs}
          </span>
          <h2>{t.contactTitle}</h2>
          <p>{t.contactBody}</p>
        </div>
        <a className="contact-button" href={`mailto:${contactEmail}`}>
          <Mail size={18} aria-hidden="true" />
          {contactEmail}
        </a>
      </section>
    </div>
  );
}

function DoctorDashboard({
  language,
  patients,
  selectedPatient,
  doctorProfile,
  setDoctorProfile,
  loading,
  error,
  setSelectedPatientId,
  addPatient
}: {
  language: Language;
  patients: Patient[];
  selectedPatient: Patient | undefined;
  doctorProfile: DoctorProfile | null;
  setDoctorProfile: (profile: DoctorProfile | null) => void;
  loading: boolean;
  error: string;
  setSelectedPatientId: (id: string) => void;
  addPatient: (payload: NewPatientPayload) => Promise<Patient>;
}) {
  const t = copy[language];
  const summary = clinicSummary(patients);
  const [filter, setFilter] = useState<PatientStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const prioritizedPatients = useMemo(
    () => sortPatientsByPriority(patients),
    [patients]
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPatients = prioritizedPatients.filter((patient) => {
    const matchesSearch =
      !normalizedSearch ||
      patient.name.toLowerCase().includes(normalizedSearch) ||
      patient.code.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (filter === 'all') {
      return true;
    }
    return classifyPatient(patient).status === filter;
  });

  if (!doctorProfile) {
    return <DoctorLogin language={language} setDoctorProfile={setDoctorProfile} />;
  }

  return (
    <section className="page-shell">
      <SectionHeading title={t.dashboardTitle} subtitle={t.dashboardSubtitle} />

      {error && <div className="form-error panel">{error}</div>}
      {loading && <div className="loading-strip panel">{t.loadingClinic}</div>}

      <div className="metric-grid">
        <MetricCard icon={AlertTriangle} label={t.filterCritical} value={summary.critical} tone="critical" />
        <MetricCard icon={Bell} label={t.filterWarning} value={summary.warning} tone="warning" />
        <MetricCard icon={Check} label={t.filterStable} value={summary.stable} tone="stable" />
        <MetricCard icon={ClipboardCheck} label={t.avgAdherence} value={`${summary.averageAdherence}%`} tone="blue" />
      </div>

      <div className="dashboard-grid">
        <div className="panel table-panel">
          <div className="panel-header">
            <div>
              <h3>{t.dashboardTitle}</h3>
              <p>{t.priorityAlerts}</p>
            </div>
            <div className="table-tools">
              <label className="search-field">
                <input
                  value={searchTerm}
                  placeholder={t.searchPatient}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <div className="filter-row">
                {[
                  ['all', t.filterAll],
                  ['stable', t.filterStable],
                  ['warning', t.filterWarning],
                  ['critical', t.filterCritical]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? 'chip active' : 'chip'}
                    onClick={() => setFilter(value as PatientStatus | 'all')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <PatientTable
            language={language}
            patients={filteredPatients}
            selectedPatientId={selectedPatient?.id}
            onSelect={setSelectedPatientId}
          />
        </div>

        <PatientDetail language={language} patient={selectedPatient} />
      </div>

      <div className="dashboard-grid secondary">
        <TrendsPanel language={language} patient={selectedPatient} />
        <NewPatientPanel language={language} addPatient={addPatient} />
      </div>
    </section>
  );
}

function DoctorLogin({
  language,
  setDoctorProfile
}: {
  language: Language;
  setDoctorProfile: (profile: DoctorProfile) => void;
}) {
  const t = copy[language];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const profile = await signInDoctor(email, password);
      setDoctorProfile(profile);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Authentication failed');
    }
  };

  return (
    <section className="auth-screen">
      <form className="auth-panel" onSubmit={handleSubmit} autoComplete="off">
        <span className="brand-mark large">
          <img className="brand-logo" src="/assets/suivi-hta-logo.png" alt="" />
        </span>
        <h1>{t.signInTitle}</h1>
        <p>{t.signInBody}</p>
        <label>
          {t.email}
          <input
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          {t.password}
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="auth-actions">
          <button className="primary-action" type="submit" disabled={!isSupabaseConfigured}>
            <LogIn size={18} aria-hidden="true" />
            {t.signIn}
          </button>
        </div>
        <small>{isSupabaseConfigured ? t.doctorOnlyAccess : t.serverRequired}</small>
      </form>
    </section>
  );
}

function ProtectedDoctorView({
  language,
  doctorProfile,
  setDoctorProfile,
  children
}: {
  language: Language;
  doctorProfile: DoctorProfile | null;
  setDoctorProfile: (profile: DoctorProfile | null) => void;
  children: ReactNode;
}) {
  if (!doctorProfile) {
    return <DoctorLogin language={language} setDoctorProfile={setDoctorProfile} />;
  }

  return <>{children}</>;
}

function PatientTable({
  language,
  patients,
  selectedPatientId,
  onSelect
}: {
  language: Language;
  patients: Patient[];
  selectedPatientId?: string;
  onSelect: (id: string) => void;
}) {
  const t = copy[language];

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.patientName}</th>
            <th>{t.status}</th>
            <th>{t.lastBP}</th>
            <th>{t.heartRate}</th>
            <th>{t.symptoms}</th>
            <th>{t.lifestyleTitle}</th>
            <th>{t.adherence}</th>
            <th>{t.lastUpdate}</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            const latest = latestReading(patient);
            const assessment = classifyPatient(patient);

            return (
              <tr
                key={patient.id}
                className={patient.id === selectedPatientId ? 'selected' : ''}
                onClick={() => onSelect(patient.id)}
              >
                <td>
                  <strong>{patient.name}</strong>
                  <span>{patient.code}</span>
                </td>
                <td>
                  <StatusBadge language={language} status={assessment.status} />
                </td>
                <td>{bpText(latest)} mmHg</td>
                <td>{latest ? `${latest.heartRate} ${t.bpm}` : '—'}</td>
                <td>{symptomText(latest, language)}</td>
                <td>
                  <LifestylePills language={language} reading={latest} compact />
                </td>
                <td>
                  <span className="adherence-bar">
                    <span style={{ width: `${adherenceRate(patient)}%` }} />
                  </span>
                  {adherenceRate(patient)}%
                </td>
                <td>{formatDateTime(latest?.recordedAt, language)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PatientDetail({
  language,
  patient
}: {
  language: Language;
  patient: Patient | undefined;
}) {
  const t = copy[language];

  if (!patient) {
    return (
      <aside className="panel patient-detail">
        <p>{t.patientNotSelected}</p>
      </aside>
    );
  }

  const latest = latestReading(patient);
  const avg = averageBP(patient);
  const assessment = classifyPatient(patient);

  return (
    <aside className="panel patient-detail">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{t.selectedPatient}</p>
          <h3>{patient.name}</h3>
        </div>
        <StatusBadge language={language} status={assessment.status} />
      </div>
      <div className="detail-stats">
        <DetailStat label={t.latest} value={`${bpText(latest)} mmHg`} />
        <DetailStat label={t.averageBP} value={`${avg.systolic}/${avg.diastolic}`} />
        <DetailStat label={t.variability} value={`${systolicVariability(patient)} mmHg`} />
        <DetailStat label={t.target} value={`${patient.targetSystolic}/${patient.targetDiastolic}`} />
      </div>
      <div className="detail-lifestyle">
        <h4>{t.lifestyleTitle}</h4>
        <LifestylePills language={language} reading={latest} />
      </div>
      <div className="reason-list">
        <h4>{t.clinicalReasons}</h4>
        {assessment.reasons.map((reason) => (
          <span key={reason}>
            <ChevronRight size={16} aria-hidden="true" />
            {reasonCopy[language][reason] ?? reason}
          </span>
        ))}
      </div>
      <div className="treatment-strip">
        <ClipboardCheck size={18} aria-hidden="true" />
        <span>{patient.treatment}</span>
      </div>
    </aside>
  );
}

function TrendsPanel({
  language,
  patient
}: {
  language: Language;
  patient: Patient | undefined;
}) {
  const t = copy[language];
  const data = patient ? chartDataForPatient(patient) : [];

  return (
    <div className="panel chart-panel">
      <div className="panel-header">
        <div>
          <h3>{t.bpTrends}</h3>
          <p>{patient?.name}</p>
        </div>
        <HeartPulse size={22} aria-hidden="true" />
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8e5ef" />
            <XAxis dataKey="date" tick={{ fill: '#60758a', fontSize: 12 }} />
            <YAxis tick={{ fill: '#60758a', fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #d8e5ef' }} />
            <Line type="monotone" dataKey="systolic" stroke="#1976d2" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="diastolic" stroke="#13a06f" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function NewPatientPanel({
  language,
  addPatient
}: {
  language: Language;
  addPatient: (payload: NewPatientPayload) => Promise<Patient>;
}) {
  const t = copy[language];
  const [payload, setPayload] = useState<NewPatientPayload>({
    name: '',
    age: 60,
    phone: '',
    treatment: '',
    accessCode: ''
  });
  const [created, setCreated] = useState<Patient | null>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const generateCode = async () => {
    setGenerating(true);
    setError('');

    try {
      const accessCode = await generateUniqueAccessCode();
      setPayload((current) => ({ ...current, accessCode }));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to generate code.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!payload.name.trim()) {
      return;
    }

    try {
      const accessCode = payload.accessCode || (await generateUniqueAccessCode());
      const patient = await addPatient({ ...payload, accessCode });
      setCreated(patient);
      setPayload({ name: '', age: 60, phone: '', treatment: '', accessCode: '' });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to create patient.');
    }
  };

  return (
    <div className="panel new-patient-panel">
      <div className="panel-header">
        <div>
          <h3>{t.newPatient}</h3>
          <p>{t.newPatientText}</p>
        </div>
        <Plus size={22} aria-hidden="true" />
      </div>
      <form className="patient-form compact" onSubmit={handleSubmit}>
        <label>
          {t.fullName}
          <input
            value={payload.name}
            onChange={(event) => setPayload({ ...payload, name: event.target.value })}
          />
        </label>
        <label>
          {t.age}
          <input
            type="number"
            min={18}
            max={110}
            value={payload.age}
            onChange={(event) =>
              setPayload({ ...payload, age: Number(event.target.value) })
            }
          />
        </label>
        <label>
          {t.phone}
          <input
            value={payload.phone}
            onChange={(event) => setPayload({ ...payload, phone: event.target.value })}
          />
        </label>
        <label>
          {t.treatment}
          <input
            value={payload.treatment}
            onChange={(event) =>
              setPayload({ ...payload, treatment: event.target.value })
            }
          />
        </label>
        <label className="code-field">
          {t.patientCode}
          <div className="code-input-row">
            <input
              value={payload.accessCode}
              placeholder={t.codePlaceholder}
              onChange={(event) =>
                setPayload({
                  ...payload,
                  accessCode: event.target.value.trim().toUpperCase()
                })
              }
            />
            <button
              className="secondary-action"
              type="button"
              onClick={generateCode}
              disabled={generating}
            >
              {generating ? t.generating : t.generateCode}
            </button>
          </div>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-action full" type="submit">
          <Plus size={18} aria-hidden="true" />
          {t.createPatient}
        </button>
      </form>

      <div className="code-result">
        <div>
          <span>{t.patientCode}</span>
          <strong>{created?.code ?? 'HTA-0000'}</strong>
          <small>{created ? t.copied : t.codeOnlyAccess}</small>
        </div>
      </div>
    </div>
  );
}

function PatientPortal({
  language,
  initialCode
}: {
  language: Language;
  initialCode?: string;
}) {
  const t = copy[language];
  const [code, setCode] = useState(initialCode ?? '');
  const [patient, setPatient] = useState<PatientPortalProfile | null>(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [treatmentTaken, setTreatmentTaken] = useState(true);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [lifestyle, setLifestyle] = useState<LifestyleReport>({
    physicalActivity: 'none',
    tobaccoUse: 'non_smoker',
    alcoholUse: 'none',
    dietQuality: 'medium'
  });
  const [form, setForm] = useState({
    morningSystolic: 132,
    morningDiastolic: 82,
    morningHeartRate: 70,
    eveningSystolic: 136,
    eveningDiastolic: 84,
    eveningHeartRate: 72
  });

  const resolveCode = async (accessCode: string) => {
    setLoading(true);
    setError('');

    try {
      const profile = await fetchPatientPortalProfile(accessCode.trim());
      if (!profile) {
        setError(t.codeNotFound);
        setPatient(null);
        return;
      }

      setPatient(profile);
      setSubmitted(false);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : t.codeNotFound);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      void resolveCode(initialCode);
    }
  }, [initialCode]);

  const handleCodeSubmit = (event: FormEvent) => {
    event.preventDefault();
    void resolveCode(code);
  };

  const toggleSymptom = (symptom: Symptom) => {
    setSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  };

  const handleReportSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!patient) {
      return;
    }

    const morningDate = new Date();
    morningDate.setHours(8, 0, 0, 0);
    const eveningDate = new Date();
    eveningDate.setHours(20, 0, 0, 0);

    const readings: Array<Omit<BPReading, 'id' | 'patientId'>> = [
      {
        period: 'morning',
        systolic: form.morningSystolic,
        diastolic: form.morningDiastolic,
        heartRate: form.morningHeartRate,
        symptoms: [],
        treatmentTaken,
        recordedAt: morningDate.toISOString(),
        ...lifestyle
      },
      {
        period: 'evening',
        systolic: form.eveningSystolic,
        diastolic: form.eveningDiastolic,
        heartRate: form.eveningHeartRate,
        symptoms,
        treatmentTaken,
        recordedAt: eveningDate.toISOString(),
        ...lifestyle
      }
    ];

    try {
      await submitPatientReadingsByCode(code.trim(), readings);
      setSubmitted(true);
      setSymptoms([]);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to submit report.');
    }
  };

  if (!patient) {
    return (
      <section className="patient-access">
        <div className="patient-access-copy">
          <span className="eyebrow">
            <Smartphone size={16} aria-hidden="true" />
            {t.patientPortalTitle}
          </span>
          <h1>{t.patientPortalSubtitle}</h1>
        </div>
        <form className="access-panel" onSubmit={handleCodeSubmit}>
          <LockKeyhole size={38} aria-hidden="true" />
          <label>
            {t.patientCode}
            <input
              autoFocus
              value={code}
              placeholder={t.codePlaceholder}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-action full" type="submit" disabled={loading}>
            {loading ? t.checkingCode : t.continue}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="patient-report-shell">
      <div className="patient-report-heading">
        <div>
          <span className="eyebrow">
            <CalendarClock size={16} aria-hidden="true" />
            {t.todayReport}
          </span>
          <h1>{patient.fullName}</h1>
          <p>{patient.treatment}</p>
        </div>
      </div>

      {submitted && (
        <div className="submit-result status-stable">
          <Check size={20} aria-hidden="true" />
          <div>
            <strong>{t.reportSaved}</strong>
            <span>{t.reportSavedText}</span>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <form className="daily-form" onSubmit={handleReportSubmit}>
        <BPGroup
          language={language}
          title={t.morningBP}
          prefix="morning"
          values={form}
          setValues={setForm}
        />
        <BPGroup
          language={language}
          title={t.eveningBP}
          prefix="evening"
          values={form}
          setValues={setForm}
        />

        <div className="symptom-panel">
          <h3>{t.symptomChecklist}</h3>
          <div className="symptom-grid">
            {symptomOptions.map((symptom) => (
              <button
                type="button"
                key={symptom}
                className={symptoms.includes(symptom) ? 'symptom active' : 'symptom'}
                onClick={() => toggleSymptom(symptom)}
              >
                {symptoms.includes(symptom) && <Check size={17} aria-hidden="true" />}
                {symptomLabel[language][symptom]}
              </button>
            ))}
          </div>
        </div>

        <div className="lifestyle-panel">
          <h3>{t.lifestyleTitle}</h3>
          <div className="lifestyle-grid">
            {lifestyleOptions.map((group) => (
              <div className="lifestyle-group" key={group.key}>
                <h4>{t[group.key]}</h4>
                <div className="option-list">
                  {group.values.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={lifestyle[group.key] === value ? 'option active' : 'option'}
                      onClick={() =>
                        setLifestyle((current) => ({
                          ...current,
                          [group.key]: value
                        }))
                      }
                    >
                      {lifestyleLabel[language][group.key][value as never]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="treatment-panel">
          <h3>{t.treatmentTaken}</h3>
          <div className="segmented">
            <button
              type="button"
              className={treatmentTaken ? 'active' : ''}
              onClick={() => setTreatmentTaken(true)}
            >
              {t.yes}
            </button>
            <button
              type="button"
              className={!treatmentTaken ? 'active' : ''}
              onClick={() => setTreatmentTaken(false)}
            >
              {t.no}
            </button>
          </div>
        </div>

        <button className="submit-report" type="submit">
          <HeartPulse size={22} aria-hidden="true" />
          {t.submitReport}
        </button>
      </form>
    </section>
  );
}

type FormShape = {
  morningSystolic: number;
  morningDiastolic: number;
  morningHeartRate: number;
  eveningSystolic: number;
  eveningDiastolic: number;
  eveningHeartRate: number;
};

function BPGroup({
  language,
  title,
  prefix,
  values,
  setValues
}: {
  language: Language;
  title: string;
  prefix: 'morning' | 'evening';
  values: FormShape;
  setValues: (value: FormShape) => void;
}) {
  const t = copy[language];
  const sysKey = `${prefix}Systolic` as keyof FormShape;
  const diaKey = `${prefix}Diastolic` as keyof FormShape;
  const hrKey = `${prefix}HeartRate` as keyof FormShape;

  const update = (key: keyof FormShape, value: number) => {
    setValues({ ...values, [key]: value });
  };

  return (
    <div className="bp-group">
      <h3>{title}</h3>
      <div className="bp-input-grid">
        <NumberField
          label={t.systolic}
          value={values[sysKey]}
          onChange={(value) => update(sysKey, value)}
          suffix="mmHg"
        />
        <NumberField
          label={t.diastolic}
          value={values[diaKey]}
          onChange={(value) => update(diaKey, value)}
          suffix="mmHg"
        />
        <NumberField
          label={t.heartRate}
          value={values[hrKey]}
          onChange={(value) => update(hrKey, value)}
          suffix={t.bpm}
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={30}
        max={260}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>{suffix}</small>
    </label>
  );
}

function AlertCenter({
  language,
  patients
}: {
  language: Language;
  patients: Patient[];
}) {
  const t = copy[language];
  const activeAlerts = sortPatientsByPriority(patients).filter(
    (patient) => classifyPatient(patient).status !== 'stable'
  );

  return (
    <section className="page-shell">
      <SectionHeading title={t.alertCenterTitle} subtitle={t.alertCenterSubtitle} />
      <div className="alerts-layout">
        <div className="panel alerts-list">
          <div className="panel-header">
            <div>
              <h3>{t.priorityAlerts}</h3>
              <p>{t.liveBadge}</p>
            </div>
            <Bell size={22} aria-hidden="true" />
          </div>
          {activeAlerts.map((patient) => {
            const assessment = classifyPatient(patient);
            const latest = latestReading(patient);
            return (
              <article key={patient.id} className={`alert-row ${statusTone[assessment.status]}`}>
                <StatusBadge language={language} status={assessment.status} />
                <div>
                  <h3>{patient.name}</h3>
                  <p>
                    {bpText(latest)} mmHg · {symptomText(latest, language)}
                  </p>
                  <div className="reason-tags">
                    {assessment.reasons.map((reason) => (
                      <span key={reason}>{reasonCopy[language][reason] ?? reason}</span>
                    ))}
                  </div>
                </div>
                <time>{formatDateTime(latest?.recordedAt, language)}</time>
              </article>
            );
          })}
        </div>

        <div className="panel rules-panel">
          <div className="panel-header">
            <div>
              <h3>{t.rules}</h3>
              <p>{t.triageTitle}</p>
            </div>
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <RuleItem status="critical" text={t.redThreshold} />
          <RuleItem status="warning" text={t.orangeThreshold} />
          <RuleItem status="critical" text={t.symptomThreshold} />
          <RuleItem status="stable" text={t.greenRule} />
        </div>
      </div>
    </section>
  );
}

function Statistics({
  language,
  patients
}: {
  language: Language;
  patients: Patient[];
}) {
  const t = copy[language];
  const summary = clinicSummary(patients);
  const distribution = [
    { name: statusLabel[language].critical, value: summary.critical, key: 'critical' },
    { name: statusLabel[language].warning, value: summary.warning, key: 'warning' },
    { name: statusLabel[language].stable, value: summary.stable, key: 'stable' }
  ];
  const riskTimeline = Array.from({ length: 7 }).map((_, index) => {
    const day = 6 - index;
    const label = day === 0 ? 'J0' : `J-${day}`;
    const elevated = patients.reduce((sum, patient) => {
      const item = recentReadings(patient, 7)[index];
      return sum + (item && (item.systolic > 160 || item.diastolic > 100) ? 1 : 0);
    }, 0);
    return { day: label, elevated };
  });

  return (
    <section className="page-shell">
      <SectionHeading title={t.statsTitle} subtitle={t.statsSubtitle} />
      <div className="metric-grid">
        <MetricCard icon={Check} label={t.controlledPatients} value={`${summary.controlledRate}%`} tone="stable" />
        <MetricCard icon={AlertTriangle} label={t.alertsToday} value={summary.critical + summary.warning} tone="critical" />
        <MetricCard icon={ClipboardCheck} label={t.avgAdherence} value={`${summary.averageAdherence}%`} tone="blue" />
        <MetricCard icon={Activity} label={t.variability} value={`${Math.round(patients.reduce((sum, patient) => sum + systolicVariability(patient), 0) / patients.length)} mmHg`} tone="warning" />
      </div>

      <div className="stats-grid">
        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h3>{t.distribution}</h3>
              <p>{t.clinicIndicators}</p>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  innerRadius={54}
                  outerRadius={92}
                  paddingAngle={3}
                  dataKey="value"
                  label={(entry) => entry.name}
                >
                  {distribution.map((entry) => (
                    <Cell key={entry.key} fill={statusColors[entry.key as PatientStatus]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #d8e5ef' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h3>{t.riskTimeline}</h3>
              <p>{t.redThreshold}</p>
            </div>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTimeline} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e5484d" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#e5484d" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8e5ef" />
                <XAxis dataKey="day" tick={{ fill: '#60758a', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#60758a', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #d8e5ef' }} />
                <Area type="monotone" dataKey="elevated" stroke="#e5484d" fill="url(#riskGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel chart-panel wide">
          <div className="panel-header">
            <div>
              <h3>{t.adherencePct}</h3>
              <p>{t.clinicIndicators}</p>
            </div>
          </div>
          <div className="chart-frame compact-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={patients.map((patient) => ({
                  name: patient.name.split(' ')[0],
                  adherence: adherenceRate(patient)
                }))}
                margin={{ top: 10, right: 16, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d8e5ef" />
                <XAxis dataKey="name" tick={{ fill: '#60758a', fontSize: 12 }} />
                <YAxis tick={{ fill: '#60758a', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #d8e5ef' }} />
                <Bar dataKey="adherence" fill="#1976d2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({
  language,
  status
}: {
  language: Language;
  status: PatientStatus;
}) {
  return (
    <span className={`status-badge ${statusTone[status]}`}>
      <span />
      {statusLabel[language][status]}
    </span>
  );
}

function MetricMini({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric-mini">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  tone: 'stable' | 'warning' | 'critical' | 'blue';
}) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <span>
        <Icon size={21} aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}

function RuleItem({
  status,
  text
}: {
  status: PatientStatus;
  text: string;
}) {
  return (
    <div className={`rule-item ${statusTone[status]}`}>
      <span />
      <p>{text}</p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LifestylePills({
  language,
  reading,
  compact = false
}: {
  language: Language;
  reading: BPReading | undefined;
  compact?: boolean;
}) {
  const items = lifestyleItems(reading, language);

  if (!items.length) {
    return <span className="empty-value">—</span>;
  }

  return (
    <div className={compact ? 'lifestyle-pills compact' : 'lifestyle-pills'}>
      {items.map((item) => (
        <div key={item.label} className="lifestyle-pill">
          <small>{item.label}</small>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="section-heading">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

export default App;
