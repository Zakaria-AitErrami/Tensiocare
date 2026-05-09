import type {
  AlcoholUse,
  DietQuality,
  Language,
  PatientStatus,
  PhysicalActivity,
  Symptom,
  TobaccoUse,
  View
} from '../types';

export const languages: { code: Language; label: string; short: string }[] = [
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'ar', label: 'العربية', short: 'AR' }
];

export const statusLabel: Record<Language, Record<PatientStatus, string>> = {
  fr: {
    stable: 'Stable',
    warning: 'A surveiller',
    critical: 'Alerte'
  },
  ar: {
    stable: 'مستقر',
    warning: 'يحتاج مراقبة',
    critical: 'تنبيه'
  }
};

export const statusTone: Record<PatientStatus, string> = {
  stable: 'status-stable',
  warning: 'status-warning',
  critical: 'status-critical'
};

export const symptomLabel: Record<Language, Record<Symptom, string>> = {
  fr: {
    headache: 'Cephalee',
    dizziness: 'Vertiges',
    chest_pain: 'Douleur thoracique',
    shortness_breath: 'Essoufflement'
  },
  ar: {
    headache: 'صداع',
    dizziness: 'دوخة',
    chest_pain: 'ألم في الصدر',
    shortness_breath: 'ضيق في التنفس'
  }
};

export const lifestyleLabel: Record<
  Language,
  {
    physicalActivity: Record<PhysicalActivity, string>;
    tobaccoUse: Record<TobaccoUse, string>;
    alcoholUse: Record<AlcoholUse, string>;
    dietQuality: Record<DietQuality, string>;
  }
> = {
  fr: {
    physicalActivity: {
      none: 'Aucune',
      walk_lt_30: 'Marche < 30 min',
      walk_gt_30: 'Marche > 30 min',
      sport: 'Sport'
    },
    tobaccoUse: {
      non_smoker: 'Non-fumeur',
      cig_1_10: '1 a 10 cigarettes',
      cig_gt_10: 'Plus de 10 cigarettes'
    },
    alcoholUse: {
      none: 'Aucun',
      drinks_1_2: '1 a 2 verres',
      drinks_gt_2: 'Plus de 2 verres'
    },
    dietQuality: {
      good: 'Bon (fait maison, sans sel ajoute)',
      medium: 'Moyen (quelques ecarts)',
      poor: 'Mauvais (plats sales, restauration)'
    }
  },
  ar: {
    physicalActivity: {
      none: 'لا شيء',
      walk_lt_30: 'مشي أقل من 30 دقيقة',
      walk_gt_30: 'مشي أكثر من 30 دقيقة',
      sport: 'رياضة'
    },
    tobaccoUse: {
      non_smoker: 'غير مدخن',
      cig_1_10: '1 إلى 10 سجائر',
      cig_gt_10: 'أكثر من 10 سجائر'
    },
    alcoholUse: {
      none: 'لا شيء',
      drinks_1_2: '1 إلى 2 كأس',
      drinks_gt_2: 'أكثر من 2 كأس'
    },
    dietQuality: {
      good: 'جيد (أكل منزلي بدون ملح مضاف)',
      medium: 'متوسط (بعض التجاوزات)',
      poor: 'سيئ (أكل مالح أو مطاعم)'
    }
  }
};

export const viewLabel: Record<Language, Record<View, string>> = {
  fr: {
    home: 'Accueil',
    doctor: 'Médecin',
    patient: 'Patient',
    alerts: 'Alertes',
    stats: 'Statistiques'
  },
  ar: {
    home: 'الرئيسية',
    doctor: 'الطبيب',
    patient: 'المريض',
    alerts: 'التنبيهات',
    stats: 'الإحصائيات'
  }
};

export const copy = {
  fr: {
    brand: 'Suivi HTA',
    tagline: 'Suivi intelligent de l’hypertension',
    heroTitle: 'Une plateforme intelligente pour anticiper les complications de l’HTA avant l’urgence',
    heroBody:
      'Une plateforme marocaine de suivi intelligent et continu de l’hypertension artérielle, conçue pour aider les médecins et cliniques à détecter plus tôt les déséquilibres tensionnels.',
    doctorCTA: 'Ouvrir le tableau médecin',
    patientCTA: 'Entrer un code patient',
    liveBadge: 'Monitoring temps reel',
    patientsFollowed: 'patients suivis',
    criticalFirst: 'priorite rouge en tete',
    dailyMinute: 'rapport patient en moins d une minute',
    productSignal: 'Plateforme HTA specialisee',
    clinicalFocus: 'Concue pour la pression arterielle, les symptomes et l observance.',
    proactiveCare: 'Medecine proactive',
    proactiveText:
      'Les patients dangereux remontent automatiquement avant les suivis routiniers.',
    simplePatients: 'Ultra-simple patient',
    simpleText:
      'Code patient, grands champs, checklist courte, bouton unique.',
    clinicReady: 'Pret clinique',
    clinicText:
      'Profils patients, alertes, tendances, adherences et statistiques par cabinet.',
    triageTitle: 'Triage automatique HTA',
    greenRule: 'Vert: tension controlee, aucun symptome, bonne observance.',
    orangeRule:
      'Orange: valeurs elevees repetees, symptomes mineurs ou observance faible.',
    redRule:
      'Rouge: TA > 180/110, douleur thoracique, dyspnee ou valeurs tres anormales.',
    dashboardTitle: 'Tableau de bord medecin',
    dashboardSubtitle:
      'Patients classes par priorite clinique avec les dernieres valeurs et alertes.',
    authenticated: 'Session clinique active',
    secureAccess: 'Accès sécurisé',
    signInTitle: 'Connexion medecin',
    signInBody:
      'Connectez votre compte professionnel autorise avec le role medecin.',
    email: 'Email',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    signOut: 'Déconnexion',
    doctorOnlyAccess: 'Acces reserve aux comptes medecin autorises.',
    serverRequired: 'Configuration serveur requise pour acceder au tableau medecin.',
    loadingClinic: 'Chargement des donnees clinique...',
    filterAll: 'Tous',
    filterStable: 'Stables',
    filterWarning: 'A surveiller',
    filterCritical: 'Critiques',
    searchPatient: 'Rechercher par nom ou code',
    patientName: 'Patient',
    status: 'Statut',
    lastBP: 'Derniere TA',
    heartRate: 'FC',
    symptoms: 'Symptomes',
    adherence: 'Observance',
    lastUpdate: 'Derniere mise a jour',
    treatmentTaken: 'Traitement pris',
    noSymptoms: 'Aucun',
    yes: 'Oui',
    no: 'Non',
    averageBP: 'TA moyenne',
    variability: 'Variabilite',
    adherencePct: 'Observance',
    bpTrends: 'Tendances tensionnelles',
    priorityAlerts: 'Alertes prioritaires',
    clinicalReasons: 'Motifs cliniques',
    newPatient: 'Creer un patient',
    newPatientText:
      'Genere un code d acces unique pour le formulaire quotidien.',
    fullName: 'Nom complet',
    age: 'Age',
    phone: 'Telephone',
    treatment: 'Traitement',
    createPatient: 'Creer profil',
    patientCode: 'Code patient',
    qrAccess: 'Acces patient',
    codeOnlyAccess: 'A transmettre au patient pour son acces quotidien.',
    generateCode: 'Generer',
    generating: 'Generation...',
    patientPortalTitle: 'Portail patient HTA',
    patientPortalSubtitle:
      'Entrez votre code fourni par le medecin pour envoyer le rapport du jour.',
    codePlaceholder: 'Ex: HTA-7429',
    continue: 'Continuer',
    checkingCode: 'Verification...',
    todayReport: 'Rapport du jour',
    morningBP: 'Tension du matin',
    eveningBP: 'Tension du soir',
    systolic: 'Systolique',
    diastolic: 'Diastolique',
    bpm: 'bpm',
    symptomChecklist: 'Symptomes',
    lifestyleTitle: 'Habitudes du jour',
    physicalActivity: 'Activite physique',
    tobaccoUse: 'Tabac',
    alcoholUse: 'Alcool',
    dietQuality: 'Regime',
    submitReport: 'Envoyer le rapport du jour',
    reportSaved: 'Rapport envoye',
    reportSavedText:
      'Votre medecin voit maintenant les nouvelles valeurs et la priorite clinique.',
    codeNotFound: 'Code patient introuvable.',
    alertCenterTitle: 'Centre d alertes HTA',
    alertCenterSubtitle:
      'Priorisation automatique basee sur les seuils tensionnels, les symptomes et l observance.',
    rules: 'Regles automatiques',
    redThreshold: 'TA > 180/110 ou douleur thoracique = alerte rouge.',
    orangeThreshold: 'TA > 160/100 repetee = surveillance orange.',
    symptomThreshold: 'Dyspnee ou douleur thoracique = attention urgente.',
    statsTitle: 'Statistiques cliniques',
    statsSubtitle:
      'Vue cabinet pour mesurer controle tensionnel, variabilite et observance.',
    distribution: 'Repartition des statuts',
    riskTimeline: 'Chronologie du risque',
    clinicIndicators: 'Indicateurs cabinet',
    controlledPatients: 'patients controles',
    alertsToday: 'alertes aujourd hui',
    avgAdherence: 'observance moyenne',
    footerTagline: 'Surveillance médicale continue, claire et accessible.',
    contactUs: 'Contactez-nous',
    contactTitle: 'Parlons de votre projet de suivi intelligent des maladies chroniques',
    contactBody:
      'Pour une démonstration, une collaboration clinique ou une intégration dans votre structure de santé, écrivez-nous directement.',
    patientNotSelected: 'Selectionnez un patient pour voir le detail.',
    selectedPatient: 'Patient selectionne',
    target: 'Objectif',
    latest: 'Dernier',
    morning: 'Matin',
    evening: 'Soir',
    routeHome: 'Retour accueil',
    copied: 'Code pret pour le patient'
  },
  ar: {
    brand: 'Suivi HTA',
    tagline: 'رعاية ذكية ومستمرة لارتفاع الضغط',
    heroTitle: 'نراقب ضغطكم الشرياني ونحمي قلوبكم.',
    heroBody:
      'منصة مغربية ذكية للمتابعة المستمرة لارتفاع ضغط الدم، تساعد الأطباء والعيادات على اكتشاف الاضطراب قبل ظهور المضاعفات.',
    doctorCTA: 'فتح لوحة الطبيب',
    patientCTA: 'إدخال رمز المريض',
    liveBadge: 'مراقبة فورية',
    patientsFollowed: 'مرضى تحت المتابعة',
    criticalFirst: 'الحالات الحمراء في المقدمة',
    dailyMinute: 'تقرير يومي في أقل من دقيقة',
    productSignal: 'منصة متخصصة في HTA',
    clinicalFocus: 'مصممة للضغط، الأعراض، والالتزام بالعلاج.',
    proactiveCare: 'طب استباقي',
    proactiveText: 'تظهر الحالات الخطرة تلقائيا قبل المتابعات الروتينية.',
    simplePatients: 'واجهة شديدة البساطة',
    simpleText: 'رمز مريض، حقول كبيرة، قائمة أعراض قصيرة، وزر واحد.',
    clinicReady: 'جاهزة للعيادة',
    clinicText: 'ملفات مرضى، تنبيهات، اتجاهات، التزام، وإحصائيات للطبيب.',
    triageTitle: 'فرز تلقائي لارتفاع الضغط',
    greenRule: 'أخضر: ضغط مضبوط، دون أعراض، والتزام جيد.',
    orangeRule: 'برتقالي: ارتفاع متكرر، أعراض بسيطة، أو التزام ضعيف.',
    redRule: 'أحمر: ضغط فوق 180/110، ألم صدري، ضيق تنفس، أو قيم خطيرة.',
    dashboardTitle: 'لوحة الطبيب',
    dashboardSubtitle: 'ترتيب المرضى حسب الأولوية السريرية مع آخر القيم والتنبيهات.',
    authenticated: 'جلسة العيادة مفعلة',
    secureAccess: 'دخول آمن',
    signInTitle: 'دخول الطبيب',
    signInBody: 'ادخل بحساب مهني مرخص له بدور طبيب.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'دخول',
    signOut: 'خروج',
    doctorOnlyAccess: 'الدخول مخصص للحسابات الطبية المرخصة.',
    serverRequired: 'إعداد الخادم مطلوب للوصول إلى لوحة الطبيب.',
    loadingClinic: 'تحميل بيانات العيادة...',
    filterAll: 'الكل',
    filterStable: 'مستقر',
    filterWarning: 'للمراقبة',
    filterCritical: 'حرج',
    searchPatient: 'البحث بالاسم أو الرمز',
    patientName: 'المريض',
    status: 'الحالة',
    lastBP: 'آخر ضغط',
    heartRate: 'النبض',
    symptoms: 'الأعراض',
    adherence: 'الالتزام',
    lastUpdate: 'آخر تحديث',
    treatmentTaken: 'تم أخذ العلاج',
    noSymptoms: 'لا يوجد',
    yes: 'نعم',
    no: 'لا',
    averageBP: 'متوسط الضغط',
    variability: 'التذبذب',
    adherencePct: 'الالتزام',
    bpTrends: 'منحنى الضغط',
    priorityAlerts: 'تنبيهات ذات أولوية',
    clinicalReasons: 'الأسباب السريرية',
    newPatient: 'إنشاء مريض',
    newPatientText: 'ينشئ رمز دخول فريد للتقرير اليومي.',
    fullName: 'الاسم الكامل',
    age: 'العمر',
    phone: 'الهاتف',
    treatment: 'العلاج',
    createPatient: 'إنشاء الملف',
    patientCode: 'رمز المريض',
    qrAccess: 'دخول المريض',
    codeOnlyAccess: 'يعطى للمريض لاستعماله يوميا.',
    generateCode: 'توليد',
    generating: 'جاري التوليد...',
    patientPortalTitle: 'بوابة مريض HTA',
    patientPortalSubtitle: 'أدخل الرمز المقدم من الطبيب لإرسال تقرير اليوم.',
    codePlaceholder: 'مثال: HTA-7429',
    continue: 'متابعة',
    checkingCode: 'جاري التحقق...',
    todayReport: 'تقرير اليوم',
    morningBP: 'ضغط الصباح',
    eveningBP: 'ضغط المساء',
    systolic: 'الانقباضي',
    diastolic: 'الانبساطي',
    bpm: 'نبضة/دقيقة',
    symptomChecklist: 'الأعراض',
    lifestyleTitle: 'عادات اليوم',
    physicalActivity: 'النشاط البدني',
    tobaccoUse: 'التدخين',
    alcoholUse: 'الكحول',
    dietQuality: 'النظام الغذائي',
    submitReport: 'إرسال تقرير اليوم',
    reportSaved: 'تم إرسال التقرير',
    reportSavedText: 'الطبيب يرى الآن القيم الجديدة والأولوية السريرية.',
    codeNotFound: 'رمز المريض غير موجود.',
    alertCenterTitle: 'مركز تنبيهات HTA',
    alertCenterSubtitle:
      'ترتيب تلقائي حسب عتبات الضغط، الأعراض، والالتزام بالعلاج.',
    rules: 'القواعد التلقائية',
    redThreshold: 'ضغط فوق 180/110 أو ألم صدري = تنبيه أحمر.',
    orangeThreshold: 'ضغط فوق 160/100 بشكل متكرر = مراقبة برتقالية.',
    symptomThreshold: 'ضيق تنفس أو ألم صدري = اهتمام عاجل.',
    statsTitle: 'إحصائيات سريرية',
    statsSubtitle: 'رؤية العيادة للتحكم في الضغط، التذبذب، والالتزام.',
    distribution: 'توزيع الحالات',
    riskTimeline: 'خط تطور الخطر',
    clinicIndicators: 'مؤشرات العيادة',
    controlledPatients: 'مرضى مضبوطون',
    alertsToday: 'تنبيهات اليوم',
    avgAdherence: 'متوسط الالتزام',
    footerTagline: 'مراقبة طبية مستمرة، واضحة، وسهلة الوصول.',
    contactUs: 'اتصلوا بنا',
    contactTitle: 'لنتحدث عن مشروعكم لمتابعة ارتفاع الضغط',
    contactBody:
      'لطلب عرض توضيحي أو تعاون طبي أو إدماج المنصة داخل مؤسسة صحية، يمكنكم مراسلتنا مباشرة.',
    patientNotSelected: 'اختر مريضا لرؤية التفاصيل.',
    selectedPatient: 'المريض المحدد',
    target: 'الهدف',
    latest: 'الأخير',
    morning: 'صباح',
    evening: 'مساء',
    routeHome: 'العودة للرئيسية',
    copied: 'الرمز جاهز للمريض'
  }
} as const;
