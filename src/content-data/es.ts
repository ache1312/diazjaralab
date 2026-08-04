import type {
  Grant,
  ResearchArea,
  SiteContent,
  TeamMember,
  TechniqueStage,
} from "./types";

const researchAreas = [
  {
    id: "brainstem-circuits",
    number: "01",
    title: "Cómo se genera y regula el ritmo respiratorio",
    summary:
      "Estudiamos cómo neuronas y astrocitos generan y regulan el ritmo respiratorio y la homeostasis cardiorrespiratoria.",
    body:
      "Estudiamos cómo neuronas y astrocitos de núcleos como el núcleo del tracto solitario (NTS), el complejo preBötzinger, Kölliker-Fuse y el núcleo retrotrapezoide (RTN) generan y regulan el ritmo respiratorio y la homeostasis cardiorrespiratoria. Un foco particular de nuestro trabajo es el rol de los astrocitos del NTS como moduladores activos, y no solo como células de soporte, en la aparición de desórdenes respiratorios, tanto en condiciones de hipoxia intermitente crónica como tras un accidente cerebrovascular isquémico cortical.",
    imageAlt:
      "Micrografía de inmunofluorescencia obtenida en el laboratorio, presentada con los colores originales de los fluoróforos.",
    figureCaption:
      "Micrografía de inmunofluorescencia obtenida por el laboratorio. Los canales se muestran en los colores originales de adquisición; la anatomía y la escala se documentarán con el registro experimental asociado.",
    question:
      "¿Qué mecanismos neuronales y astrocitarios sostienen el ritmo respiratorio y la homeostasis cardiorrespiratoria?",
    hypothesis:
      "Los astrocitos de núcleos respiratorios participan activamente en la regulación del circuito y contribuyen a su disfunción en enfermedad.",
    systems: ["NTS", "Complejo preBötzinger", "Kölliker-Fuse", "RTN"],
    measurements: ["Fisiología cardiorrespiratoria", "Electrofisiología", "Microscopía"],
    status: "Pregunta activa · antecedentes publicados",
    relatedDois: ["10.1186/s40659-023-00463-0", "10.1152/ajplung.00280.2024"],
  },
  {
    id: "respiratory-neurodynamics",
    number: "02",
    title: "Cómo la respiración sincroniza redes cerebrales",
    summary:
      "Investigamos cómo las oscilaciones respiratorias sincronizan circuitos corticales e hipocampales.",
    body:
      "La respiración no solo mantiene la homeostasis: también organiza la actividad cerebral. Investigamos cómo las oscilaciones respiratorias sincronizan circuitos corticales e hipocampales, y cómo esta sincronización se relaciona con procesos cognitivos, sueño y aprendizaje. En nuestros modelos de hipoxia intermitente crónica y accidente cerebrovascular isquémico, estudiamos cómo la disfunción de los núcleos respiratorios del tronco encefálico, mediada por astrocitos, repercute en la conectividad de estos circuitos.",
    imageAlt:
      "Imagen científica de fluorescencia producida por el laboratorio sobre fondo oscuro.",
    figureCaption:
      "Imagen de fluorescencia producida por el laboratorio. Se conserva el aspecto multicanal de la adquisición; la interpretación depende de la preparación y los marcadores de cada experimento.",
    question:
      "¿Cómo se acoplan las oscilaciones respiratorias con la actividad cortical e hipocampal?",
    hypothesis:
      "La dinámica respiratoria aporta una referencia temporal para redes cerebrales vinculadas con sueño, aprendizaje y cognición.",
    systems: ["Tronco encefálico", "Corteza", "Hipocampo"],
    measurements: ["LFP multicanal", "Señales respiratorias", "Análisis temporal"],
    status: "Línea en desarrollo",
    relatedDois: ["10.1096/fasebj.2020.34.s1.05130", "10.1111/apha.13864"],
  },
  {
    id: "disease-neurophysiology",
    number: "03",
    title: "Qué cambia en la enfermedad",
    summary:
      "Abordamos la relación bidireccional entre alteraciones cerebrales, función respiratoria, fisiología y cognición.",
    body:
      "Las alteraciones cerebrales pueden modificar profundamente la función respiratoria y, a su vez, la disfunción respiratoria puede agravar el curso de una enfermedad. Trabajamos con dos modelos que abordan esta relación bidireccional: hipoxia intermitente crónica y accidente cerebrovascular isquémico cortical. En ambos estudiamos cómo las alteraciones de núcleos respiratorios mediadas por astrocitos afectan la fisiología y la cognición.",
    imageAlt:
      "Micrografía multicanal del laboratorio con señales fluorescentes sobre fondo negro.",
    figureCaption:
      "Micrografía multicanal obtenida por el laboratorio. La imagen se presenta como registro experimental, sin atribuir marcadores o regiones que no estén confirmados en sus metadatos.",
    question:
      "¿Cómo se modifican recíprocamente la respiración, la actividad cerebral y la progresión de la enfermedad?",
    hypothesis:
      "La alteración glial de núcleos respiratorios puede conectar la disfunción cardiorrespiratoria con cambios cerebrales y cognitivos.",
    systems: ["Hipoxia intermitente crónica", "Isquemia cortical", "Insuficiencia cardíaca"],
    measurements: ["Ventilación", "Control autonómico", "Actividad glial"],
    status: "Evidencia previa · nuevos modelos activos",
    relatedDois: ["10.1016/j.ebiom.2022.104044", "10.1007/s00395-025-01154-5"],
  },
] as const satisfies readonly ResearchArea[];

const grants = [
  {
    id: "anid-installation-85250074",
    agency: "ANID · Proyecto Instalación Académica",
    number: "N.º 85250074",
    title:
      "Instalación académica del Dr. Esteban Díaz Jara… control neural cardiorrespiratorio en enfermedades cardiometabólicas y genéticas",
    officialTitle:
      "Instalación académica del Dr. Esteban Díaz Jara... control neural cardiorrespiratoria en enfermedades cardio-metabólicas y genéticas",
    officialLang: "es",
    principalInvestigatorLabel: "Investigador principal",
    principalInvestigator: "Dr. Esteban Díaz Jara",
    endDateLabel: "Término",
    endDate: "1 de octubre de 2028",
    endDateIso: "2028-10-01",
    state: "published",
  },
  {
    id: "fondecyt-3260612",
    agency: "FONDECYT",
    number: "N.º 3260612",
    title:
      "La activación de astrocitos en el núcleo del tracto solitario impulsa trastornos cardiorrespiratorios en las etapas tempranas de la hipoxia intermitente crónica: rol del estrés oxidativo mitocondrial y del desborde de glutamato",
    officialTitle:
      "Astrocyte Activation in the Nucleus Tractus Solitarii Drives Cardiorespiratory Disorders in the Early Stages of Chronic Intermittent Hypoxia: The Role of Mitochondrial Oxidative Stress and Glutamate Spillover",
    officialLang: "en",
    principalInvestigatorLabel: "Investigador principal",
    principalInvestigator: "Dr. Esteban Díaz Jara",
    endDateLabel: "Término",
    endDate: "31 de marzo de 2029",
    endDateIso: "2029-03-31",
    state: "published",
  },
] as const satisfies readonly Grant[];

const techniqueStages = [
  {
    id: "manipulate",
    number: "01",
    verb: "Manipular",
    title: "Modelos y causalidad",
    description:
      "Generamos modelos de enfermedad y manipulamos circuitos específicos para poner a prueba relaciones causales entre astrocitos, circuitos respiratorios y enfermedad.",
    items: [
      "Hipoxia intermitente crónica",
      "Accidente cerebrovascular isquémico cortical",
      "Quimiogenética (DREADDs)",
    ],
    scope:
      "Modelos preclínicos de hipoxia intermitente crónica y accidente cerebrovascular isquémico cortical.",
    output:
      "Perturbaciones definidas para evaluar relaciones causales en circuitos y poblaciones celulares.",
    accent: "amber",
  },
  {
    id: "measure",
    number: "02",
    verb: "Medir",
    title: "Fisiología en tiempo real",
    description:
      "Registramos la actividad respiratoria, cardiorrespiratoria y cerebral con alta resolución temporal en animales despiertos.",
    items: [
      "Pletismografía",
      "Registro cardiorrespiratorio",
      "Instrumentación cardiorrespiratoria avanzada",
      "Open Ephys",
      "LFP multicanal (32 canales)",
    ],
    scope:
      "Animales despiertos, registros cardiorrespiratorios y LFP multicanal de 32 canales.",
    output:
      "Series temporales sincronizadas de ventilación, variables cardiovasculares y actividad neuronal.",
    accent: "teal",
  },
  {
    id: "visualize",
    number: "03",
    verb: "Visualizar",
    title: "Células y circuitos",
    description:
      "Identificamos y caracterizamos in vitro las poblaciones celulares involucradas en los circuitos respiratorios.",
    items: [
      "Inmunofluorescencia",
      "Microscopía confocal",
      "Imagen de calcio en cortes cerebrales",
    ],
    scope:
      "Tejido marcado por inmunofluorescencia y cortes cerebrales para estudios in vitro.",
    output:
      "Distribución celular, morfología y señales de calcio en células y circuitos definidos.",
    accent: "cyan",
  },
  {
    id: "analyze",
    number: "04",
    verb: "Analizar",
    title: "Señales y estructura",
    description:
      "Extraemos estructura interpretable a partir de señales electrofisiológicas, imágenes y datos de expresión génica.",
    items: [
      "Python",
      "Análisis de señales",
      "Procesamiento de datos",
      "Aprendizaje automático",
      "Análisis transcriptómico",
    ],
    scope:
      "Señales electrofisiológicas, imágenes y datos de expresión génica.",
    output:
      "Métricas reproducibles, relaciones temporales y patrones multivariados interpretables.",
    accent: "navy",
  },
] as const satisfies readonly TechniqueStage[];

const teamMembers = [
  {
    id: "esteban-diaz-jara",
    name: "Esteban Díaz Jara",
    group: "principal-investigator",
    role: "Investigador principal y profesor asociado",
    credentials: "Bioquímico · Doctor en Ciencias Biológicas, mención Fisiología",
    institution: "Universidad Autónoma de Chile",
    bio: [
      "Esteban es bioquímico de la Universidad Austral de Chile, en Valdivia. Realizó su tesis de pregrado bajo la tutela de Felipe Barros en el Centro de Estudios Científicos (CECs), donde estudió el metabolismo energético neuronal. Posteriormente se trasladó a Santiago y trabajó con Juan Andrés Orellana en comunicación glía-neurona mediada por conexinas y panexinas.",
      "En 2019 ingresó al Doctorado en Ciencias Biológicas, mención Fisiología, de la Pontificia Universidad Católica de Chile. Bajo la tutela de Rodrigo Del Río, su tesis doctoral estudió el rol de los transportadores de glutamato de astrocitos del núcleo retrotrapezoide en la potenciación del quimiorreflejo central y el desarrollo de alteraciones respiratorias en un modelo de insuficiencia cardíaca con fracción de eyección preservada.",
      "A mediados de 2025 se incorporó como investigador y profesor asociado al Instituto de Ciencias Biomédicas de la Universidad Autónoma de Chile, donde, en paralelo, realiza su postdoctorado bajo la tutela del profesor Rodrigo Iturriaga.",
    ],
    research:
      "Su trabajo integra fisiología cardiorrespiratoria, señalización astrocitaria y dinámica de circuitos para estudiar la relación entre respiración y función cerebral en salud y enfermedad.",
    portrait: "/images/team/esteban-diaz-jara.jpg",
    portraitAlt: "Retrato de Esteban Díaz Jara.",
    state: "published",
  },
  {
    id: "sinay-vicencio-orellana",
    name: "Sinay C. Vicencio Orellana",
    group: "coordination",
    role: "Lab manager y coordinadora",
    credentials:
      "Bioquímica · Magíster en Ciencias Biológicas · Candidata a Doctora en Ciencias Fisiológicas",
    bio: [
      "Sinay es la mánager del Laboratorio de Neurodinámica Respiratoria, dirigido por el Dr. Esteban Díaz Jara. Su formación abarca neurobiología y modelos preclínicos de patologías de la mielina del sistema nervioso central, fisiología cardiorrespiratoria y medicina traslacional, con especial interés en medicina preventiva del envejecimiento.",
      "En el laboratorio, su rol combina la organización logística y la planificación experimental con la ejecución de experimentos de biología molecular, fisiología y microscopía. También coordina las prioridades y el calendario experimental de los proyectos.",
    ],
    research:
      "Coordina la operación científica del laboratorio y participa en experimentos de biología molecular, fisiología y microscopía.",
    portrait: "/images/team/sinay-vicencio-orellana.jpg",
    portraitAlt: "Retrato de Sinay C. Vicencio Orellana en el laboratorio.",
    state: "published",
  },
  {
    id: "pablo-burgos",
    name: "Pablo Burgos",
    group: "graduate",
    role: "Estudiante de posgrado",
    credentials: "Físico · Magíster en Neurociencia",
    institution: "Universidad Autónoma de Chile",
    bio: ["Bio en preparación."],
    portrait: null,
    portraitAlt: null,
    state: "forthcoming",
    statusLabel: "Bio en preparación",
  },
  {
    id: "francisca-silva",
    name: "Francisca Silva",
    group: "graduate",
    role: "Tesista de Magíster en Fisiología y Farmacología",
    credentials: "Estudiante de magíster",
    institution: "Universidad de Valparaíso",
    bio: ["Bio en preparación."],
    portrait: null,
    portraitAlt: null,
    state: "forthcoming",
    statusLabel: "Bio en preparación",
  },
  {
    id: "sebastian-cortes",
    name: "Sebastián Cortés",
    group: "undergraduate",
    role: "Tesista de pregrado en Química y Farmacia",
    credentials: "Estudiante de pregrado",
    institution: "Universidad Autónoma de Chile",
    bio: ["Bio en preparación."],
    portrait: null,
    portraitAlt: null,
    state: "forthcoming",
    statusLabel: "Bio en preparación",
  },
  {
    id: "fernanda-castillo",
    name: "Fernanda Castillo",
    group: "undergraduate",
    role: "Tesista de pregrado en Química y Farmacia",
    credentials: "Estudiante de pregrado",
    institution: "Universidad Autónoma de Chile",
    bio: ["Bio en preparación."],
    portrait: null,
    portraitAlt: null,
    state: "forthcoming",
    statusLabel: "Bio en preparación",
  },
] as const satisfies readonly TeamMember[];

export const esContent = {
  locale: "es",
  htmlLang: "es-CL",
  languageName: "Español",
  alternateLanguageLabel: "English",
  routes: {
    home: "/",
    research: "/investigacion/",
    techniques: "/tecnicas/",
    team: "/equipo/",
    publications: "/publicaciones/",
    philosophy: "/filosofia/",
    outreach: "/divulgacion/",
    contact: "/contacto/",
  },
  seo: {
    home: {
      title: "Laboratorio de Neurodinámica Respiratoria | Díaz-Jara Lab",
      description:
        "Laboratorio de la Universidad Autónoma de Chile que investiga cómo los circuitos respiratorios y los astrocitos influyen en la actividad cerebral, la fisiología y la enfermedad.",
    },
    research: {
      title: "Investigación | Díaz-Jara Lab",
      description:
        "Líneas de investigación en circuitos respiratorios, neurodinámica y neurofisiología de la enfermedad.",
    },
    techniques: {
      title: "Técnicas | Díaz-Jara Lab",
      description:
        "Métodos para modelos de enfermedad, fisiología in vivo, microscopía, electrofisiología y análisis computacional.",
    },
    team: {
      title: "Equipo | Díaz-Jara Lab",
      description:
        "Integrantes del Laboratorio de Neurodinámica Respiratoria de la Universidad Autónoma de Chile.",
    },
    publications: {
      title: "Publicaciones | Díaz-Jara Lab",
      description:
        "Catálogo de 46 registros académicos atribuidos a Esteban Díaz-Jara, incluidos 25 artículos y revisiones, contrastados con Scholar y OpenAlex.",
    },
    philosophy: {
      title: "Cómo trabajamos | Díaz-Jara Lab",
      description:
        "Honestidad, curiosidad, autocrítica, responsabilidad y trabajo en equipo orientan nuestra forma de hacer ciencia.",
    },
    outreach: {
      title: "Divulgación | Díaz-Jara Lab",
      description:
        "Cápsulas de divulgación sobre respiración, cerebro y neurociencia para públicos no especializados.",
    },
    contact: {
      title: "Contacto | Díaz-Jara Lab",
      description:
        "Escríbenos o visita el Laboratorio de Neurodinámica Respiratoria en Huechuraba, Santiago de Chile.",
    },
  },
  brand: {
    name: "Díaz-Jara Lab",
    scientificName: "Laboratorio de Neurodinámica Respiratoria",
    shortDescription: "Respiración, circuitos cerebrales y enfermedad.",
    logoAlt: "Díaz-Jara Lab, Laboratorio de Neurodinámica Respiratoria",
  },
  navigation: {
    ariaLabel: "Navegación principal",
    openMenuLabel: "Abrir menú",
    closeMenuLabel: "Cerrar menú",
    laboratoryMenuLabel: "Laboratorio",
    languageSwitcherLabel: "Cambiar idioma",
    items: [
      { page: "research", label: "Investigación", menu: "primary" },
      { page: "techniques", label: "Técnicas", menu: "primary" },
      { page: "team", label: "Equipo", menu: "primary" },
      { page: "publications", label: "Publicaciones", menu: "primary" },
      { page: "philosophy", label: "Cómo trabajamos", menu: "laboratory" },
      { page: "outreach", label: "Divulgación", menu: "laboratory" },
      { page: "contact", label: "Contacto", menu: "primary" },
    ],
  },
  common: {
    skipToContent: "Saltar al contenido",
    readMore: "Leer más",
    learnMore: "Más información",
    backToHome: "Volver al inicio",
    stateLabels: {
      published: "Publicado",
      forthcoming: "En preparación",
    },
  },
  home: {
    eyebrow: "Neurodinámica Respiratoria · Universidad Autónoma de Chile",
    title: "Control neural y glial de la respiración",
    introduction:
      "Investigamos cómo neuronas y astrocitos del tronco encefálico regulan la respiración y cómo esas señales se relacionan con la fisiología, la cognición y la enfermedad.",
    affiliation: "Instituto de Ciencias Biomédicas",
    location: "Huechuraba · Santiago de Chile",
    primaryAction: { label: "Líneas de investigación", page: "research" },
    secondaryAction: { label: "Publicaciones", page: "publications" },
    heroActionsLabel: "Accesos científicos",
    heroFacts: [
      { label: "Foco", value: "Neuronas y astrocitos del tronco encefálico" },
      { label: "Modelos", value: "Hipoxia intermitente e isquemia cortical" },
      { label: "Mediciones", value: "Fisiología, electrofisiología y microscopía" },
    ],
    heroImageAlt:
      "Micrografía de inmunofluorescencia del laboratorio con señales verdes, rojas, cian y azules sobre fondo negro.",
    heroImageCaption:
      "DJL-IMG-H01 · Adquisición multicanal · Anatomía y escala en verificación",
    media: {
      hero: "science-rvlm-network",
      registerOne: "science-rvlm-astrocytes",
      registerTwo: "science-nts-gfap",
      registerThree: "science-cih-iba1",
      teamEsteban: "team-esteban-diaz-jara",
      teamSinay: "team-sinay-vicencio",
    },
    publicEntry: {
      eyebrow: "Para comenzar",
      title: "Respirar parece automático. Para el cerebro, es una tarea coordinada segundo a segundo.",
      introduction:
        "Al dormir, caminar o hacer ejercicio, el cuerpo cambia sus necesidades. Circuitos del cerebro reciben esa información y ajustan el ritmo respiratorio sin que tengamos que pensarlo.",
      body: [
        "Parte de ese trabajo ocurre en el tronco encefálico, donde neuronas y astrocitos participan en redes que generan y modulan la respiración. El Dr. Esteban Díaz Jara estudia cómo se coordinan esas células y cómo sus señales se relacionan con la actividad respiratoria, cardiovascular y cerebral.",
        "El laboratorio observa qué cambia frente a la hipoxia intermitente o una lesión cerebral isquémica. Para seguir el proceso desde la célula hasta el organismo, combina fisiología, electrofisiología, microscopía y análisis de datos.",
      ],
      questionLabel: "La pregunta que conecta el trabajo",
      question:
        "¿Cómo cambia la coordinación entre células y circuitos respiratorios antes de que la alteración se vuelva visible en todo el organismo?",
      glossaryLabel: "Tres conceptos para leer el sitio",
      glossary: [
        {
          term: "Tronco encefálico",
          definition:
            "Región que conecta el encéfalo con la médula y participa en funciones automáticas esenciales, entre ellas la respiración.",
        },
        {
          term: "Astrocito",
          definition:
            "Célula glial que mantiene el entorno de las neuronas y también interviene en la comunicación de los circuitos.",
        },
        {
          term: "Modelo preclínico",
          definition:
            "Sistema experimental que permite poner a prueba un mecanismo biológico; sus resultados no equivalen directamente a lo que ocurre en pacientes.",
        },
      ],
      scopeLabel: "Alcance",
      scope:
        "Estos estudios buscan comprender mecanismos biológicos. No entregan diagnósticos ni consejo médico, y una hipótesis se presenta como tal hasta que la evidencia permita evaluarla.",
      linksLabel: "Continúa según lo que quieras conocer",
      links: [
        { label: "Entender las preguntas", page: "research" },
        { label: "Ver cómo investigamos", page: "techniques" },
        { label: "Conocer al equipo", page: "team" },
      ],
    },
    imageRegister: {
      label: "DJL / REGISTRO DE IMAGEN / 01–03",
      title: "Imágenes tratadas como evidencia, no como decoración",
      introduction:
        "Estas adquisiciones se presentan en sus canales originales. La anatomía, los marcadores y la escala solo se atribuyen cuando el registro experimental asociado permite confirmarlos.",
      statusLabel: "Estado del registro",
      status: "Descripción provisional",
      criterionLabel: "Criterio de publicación",
      criterion:
        "No inferir identidad celular, región anatómica o escala desde la imagen aislada.",
      figures: [
        {
          code: "DJL-IMG-01",
          title: "Campo multicanal 01",
          note: "Inmunofluorescencia · canales originales",
          alt: "Campo experimental multicanal con señales verdes, magenta y azules sobre fondo negro.",
        },
        {
          code: "DJL-IMG-02",
          title: "Campo multicanal 02",
          note: "Registro tisular · metadatos en verificación",
          alt: "Campo experimental con estructuras verdes y núcleos azules sobre fondo negro.",
        },
        {
          code: "DJL-IMG-03",
          title: "Campo multicanal 03",
          note: "Registro tisular · escala en verificación",
          alt: "Campo experimental con estructuras magenta y núcleos azules sobre fondo negro.",
        },
      ],
    },
    researchEyebrow: "Investigación",
    researchTitle: "Tres preguntas que ordenan el trabajo actual",
    researchIntroduction:
      "Del mecanismo celular a la cognición, estudiamos cómo se genera la respiración, cómo sincroniza otras redes cerebrales y qué cambia en la enfermedad.",
    researchAreas,
    pipelineEyebrow: "Métodos",
    pipelineTitle: "De la perturbación al registro interpretable",
    pipelineIntroduction:
      "Combinamos modelos de enfermedad, registros fisiológicos en animales despiertos, microscopía, electrofisiología y análisis computacional para relacionar cambios celulares con la actividad cardiorrespiratoria y cerebral.",
    pipelineStages: [
      { id: "manipulate", number: "01", verb: "Manipular" },
      { id: "measure", number: "02", verb: "Medir" },
      { id: "visualize", number: "03", verb: "Visualizar" },
      { id: "analyze", number: "04", verb: "Analizar" },
    ],
    fundingEyebrow: "Financiamiento vigente",
    fundingTitle: "Proyectos ANID y FONDECYT",
    fundingIntroduction:
      "El programa cuenta con financiamiento para estudiar el control neural cardiorrespiratorio y la señalización astrocitaria.",
    publicationsEyebrow: "Registro científico",
    publicationsTitle: "Publicaciones recientes",
    publicationsIntroduction:
      "Una selección de artículos recientes de la trayectoria científica de Esteban Díaz-Jara. Cada registro enlaza su fuente editorial y el catálogo conserva la procedencia bibliográfica.",
    publicationsActionLabel: "Explorar todas las publicaciones",
    publicationLinkLabel: "Abrir publicación",
    openAccessLabel: "Acceso abierto",
    singleCitationLabel: "cita en Scholar",
    citationsLabel: "citas en Scholar",
    publicationAuthorsContinuation: "y cols.",
    teamEyebrow: "Equipo",
    teamTitle: "Personas y trabajo experimental",
    teamIntroduction:
      "Esteban Díaz Jara dirige el programa científico; Sinay C. Vicencio Orellana coordina la operación del laboratorio y participa en biología molecular, fisiología y microscopía.",
    teamPortraitAlt: {
      principalInvestigator: "Retrato de Esteban Díaz Jara",
      laboratoryCoordinator: "Retrato de Sinay C. Vicencio Orellana",
    },
    teamActionLabel: "Ver perfiles y funciones",
    joinEyebrow: "Tesis · colaboración · formación",
    joinTitle: "Conversaciones científicas con un problema concreto",
    joinIntroduction:
      "Podemos conversar con estudiantes e investigadores que traigan una pregunta definida en neurofisiología respiratoria, señalización astrocitaria, microscopía o análisis computacional.",
    joinAction: { label: "Información de contacto", page: "contact" },
  },
  research: {
    eyebrow: "Investigación",
    title: "Circuitos respiratorios, astrocitos y enfermedad",
    introduction:
      "Investigamos cómo los circuitos respiratorios del tronco encefálico interactúan con las redes cerebrales que sostienen la fisiología, el comportamiento y la enfermedad. Organizamos nuestro trabajo en tres preguntas complementarias, que van desde el mecanismo celular hasta su impacto en la función cerebral.",
    media: {
      brainstemCircuits: "science-rvlm-astrocytes",
      respiratoryNeurodynamics: "science-nts-gfap",
      diseaseNeurophysiology: "science-cih-iba1",
    },
    asideLabel: "Escala de trabajo",
    asideText: "Mecanismos celulares → circuitos → fisiología y cognición.",
    questionLabel: "Pregunta",
    hypothesisLabel: "Hipótesis de trabajo",
    systemsLabel: "Sistemas",
    measurementsLabel: "Mediciones",
    contextLabel: "Contexto y alcance",
    relatedEvidenceLabel: "Antecedentes relacionados",
    areas: researchAreas,
    fundingEyebrow: "Financiamiento",
    fundingTitle: "Proyectos vigentes",
    fundingIntroduction:
      "Estas iniciativas financian el desarrollo del laboratorio y estudios sobre control cardiorrespiratorio, astrocitos y enfermedad.",
    grants,
  },
  techniques: {
    eyebrow: "Técnicas",
    title: "Diseño experimental y capacidades metodológicas",
    introduction:
      "Organizamos nuestras capacidades según el orden real del trabajo científico: generamos y manipulamos modelos, medimos la fisiología, visualizamos células y circuitos, y analizamos los datos resultantes.",
    railLabel: "Pipeline experimental",
    asideText: "Cada etapa responde una parte de la misma pregunta científica.",
    scopeLabel: "Sistema o muestra",
    outputLabel: "Salida experimental",
    methodsLabel: "Métodos y recursos",
    stages: techniqueStages,
    closingEyebrow: "Integración",
    closingTitle: "Integración de métodos",
    closingText:
      "La integración de fisiología in vivo, microscopía, electrofisiología y análisis computacional nos permite vincular cambios celulares con patrones cardiorrespiratorios y actividad cerebral.",
  },
  team: {
    eyebrow: "Equipo",
    title: "Equipo de investigación",
    introduction:
      "El equipo reúne investigadores y estudiantes con formación en fisiología, neurobiología, microscopía y análisis de datos.",
    asideLabel: "Nuestra forma de trabajar",
    asideText: "Autonomía, colaboración, curiosidad y rigor.",
    scientificResponsibilityLabel: "Responsabilidad científica",
    profileLinksLabel: "Perfiles académicos de Esteban Díaz Jara",
    media: {
      estebanDiazJara: "team-esteban-diaz-jara",
      sinayVicencio: "team-sinay-vicencio",
    },
    groups: [
      { id: "principal-investigator", label: "Investigador principal" },
      { id: "coordination", label: "Coordinación" },
      { id: "graduate", label: "Estudiantes de posgrado" },
      { id: "undergraduate", label: "Estudiantes de pregrado" },
    ],
    members: teamMembers,
  },
  publications: {
    eyebrow: "Publicaciones",
    title: "Trayectoria científica del investigador principal",
    introduction:
      "El catálogo reúne trabajos atribuidos a Esteban Díaz-Jara sobre neuroglía, quimiorrecepción y control cardiorrespiratorio. Cada registro conserva enlaces a sus fuentes académicas para facilitar su revisión.",
    profilesTitle: "Perfiles académicos",
    profiles: [
      { id: "openalex", label: "OpenAlex", href: "https://openalex.org/A5103209783", state: "published" },
      {
        id: "google-scholar",
        label: "Google Scholar",
        href: "https://scholar.google.com/citations?user=aREuxgcAAAAJ&hl=es",
        state: "published",
      },
    ],
    status: "published",
    statusTitle: "Fuentes y criterios de integración",
    statusText:
      "Esta reconstrucción es putativa: integra coincidencias por DOI, título, coautoría y trayectoria temática. Las fichas se enlazan a sus fuentes para que puedan ser revisadas por el autor. Las diferencias entre año online-first y año de volumen se resolvieron con Crossref cuando estuvo disponible.",
    emptyListLabel: "No hay registros que coincidan con la búsqueda.",
    metrics: {
      ariaLabel: "Resumen bibliométrico",
      papers: "Artículos y revisión",
      works: "Obras canónicas",
      citations: "Citas en Scholar",
      hIndex: "Índice h",
      openAccess: "Con acceso abierto",
    },
    network: {
      eyebrow: "Red bibliográfica",
      title: "Relaciones entre publicaciones y temas de investigación",
      introduction:
        "La red incluye {papers} artículos y revisiones visibles del catálogo, organizados en {topics} temas. Las aristas se estiman mediante referencias compartidas en OpenAlex, coautoría y proximidad temporal. Pase el cursor o use el teclado para previsualizar; seleccione un nodo para mantenerlo en foco.",
      papers: "publicaciones",
      themes: "temas",
      contentsLabel: "Contenido de la red",
      graphLabel: "Red interactiva de publicaciones y temas de investigación",
      focusLabel: "Filtrar por relaciones con publicaciones de referencia",
      complete: "Vista completa",
      export: "Descargar BibTeX",
      paperLegend: "Nodo turquesa: publicación",
      sizeLegend: "Tamaño: citas en Google Scholar",
      recentLegend: "Brillo: año de publicación",
      relationLegend: "Línea turquesa · grosor y opacidad: afinidad bibliográfica",
      selectedPaper: "Publicación en foco",
      selectedTheme: "Tema en foco",
      citations: "citas",
      topicHeading: "Temas asignados",
      connectedHeading: "Conexiones bibliográficas",
      connectionOrder: "Ordenadas por peso de la relación; ante empates, se priorizan citas y recencia. No es un ranking de calidad.",
      exploreConnection: "Enfocar en la red",
      noConnections: "No hay publicaciones relacionadas en esta vista.",
      source: "Abrir fuente",
      catalogue: "Ver registro en el catálogo",
      inferredTheme: "Tema inferido a partir del corpus de publicaciones",
      themeNote: "Clasificación editorial para facilitar la exploración; no constituye una categoría bibliométrica.",
      method:
        "Modelo exploratorio. Las relaciones no constituyen una evaluación bibliométrica y pueden revisarse desde las fuentes enlazadas.",
      nodePaper: "Publicación",
      nodeTheme: "Tema",
      legendLabel: "Leyenda de la red",
    },
    catalogue: {
      eyebrow: "Catálogo completo",
      title: "Producción académica de Esteban Díaz-Jara",
      introduction:
        "El listado cruza el perfil público de Google Scholar con cinco identidades de autor en OpenAlex, elimina duplicados editoriales y conserva abstracts, correcciones, capítulos y tesis como registros independientes.",
      filterLabel: "Filtrar publicaciones",
      filterArticles: "Artículos",
      filterAbstracts: "Abstracts",
      filterOther: "Otros",
      filterAll: "Todo",
      searchLabel: "Buscar por título, autor o revista",
      searchPlaceholder: "Ej. astrocytes, heart failure…",
      sortLabel: "Ordenar",
      sortCurated: "Selección del laboratorio",
      sortNewest: "Más recientes",
      sortCited: "Más citadas",
      sortOldest: "Más antiguas",
      topicLabel: "Tema de investigación",
      topicAll: "Todos los temas",
      featured: "Selección del laboratorio",
      shown: "registros visibles",
      citedBy: "citas",
      scholar: "Scholar",
      openAlex: "OpenAlex",
      doi: "DOI",
      openAccess: "Texto abierto",
      sourceCrossed: "Scholar + OpenAlex",
      sourceScholar: "Solo Scholar",
      downloadBib: "Descargar BibTeX",
      scholarOnlyNote:
        "Presentación oral OS 14-05, IUPS 2025; no se localizó DOI ni registro en OpenAlex.",
      backToFilters: "Volver a filtros",
    },
    typeLabels: {
      journalArticle: "Artículo",
      review: "Revisión",
      conferenceAbstract: "Abstract de congreso",
      conferenceProceedingsChapter: "Capítulo / proceedings",
      correction: "Corrección",
      doctoralThesis: "Tesis doctoral",
    },
    provenance: {
      eyebrow: "Proveniencia de datos",
      updatedLabel: "Actualizado",
      sourcesLabel: "Fuentes consultadas",
      sources: [
        { label: "Google Scholar", href: "https://scholar.google.com/citations?user=aREuxgcAAAAJ&hl=es" },
        { label: "OpenAlex", href: "https://openalex.org/A5103209783" },
        { label: "Crossref", href: "https://www.crossref.org/" },
        { label: "IUPS 2025", href: "https://www.iups.org/wp-content/uploads/2025/08/programme-2025-08-22.pdf" },
      ],
    },
  },
  philosophy: {
    eyebrow: "Prácticas del laboratorio",
    title: "Cómo registramos, revisamos y aprendemos",
    introduction:
      "Criterios operativos para registrar datos, revisar resultados, formar investigadores y coordinar el trabajo experimental.",
    asideLabel: "Alcance",
    asideText: "Datos · formación · colaboración",
    generalCriterionLabel: "Criterio general",
    statement:
      "La honestidad con los datos, con el propio trabajo y con el equipo es un principio central del laboratorio. Mantenemos estándares altos y reconocemos que la formación científica requiere tiempo, supervisión y autonomía progresiva. La curiosidad y la autocrítica orientan el diseño experimental y la interpretación de resultados. Cada integrante desarrolla su proyecto con responsabilidad individual y colaboración cotidiana; los errores se analizan para corregir procedimientos y aprender.",
    missionLabel: "Misión",
    mission:
      "Investigar cómo los circuitos respiratorios del tronco encefálico interactúan con las redes cerebrales para comprender la fisiología, el comportamiento y la enfermedad, formando en el proceso investigadores honestos, autónomos, autocríticos y capaces de trabajar en equipo.",
    visionLabel: "Visión",
    vision:
      "Consolidar en Latinoamérica un programa de investigación en neurodinámica respiratoria que produzca conocimiento reproducible y forme investigadores íntegros, autónomos y rigurosos.",
    valuesEyebrow: "Cómo trabajamos",
    valuesTitle: "Criterios observables de trabajo",
    valuesIntroduction:
      "Cada principio se expresa como una conducta observable en el trabajo cotidiano.",
    values: [
      {
        id: "honesty",
        number: "01",
        title: "Honestidad",
        description:
          "Registramos resultados esperados e inesperados, conservamos los datos originales y comunicamos desviaciones del protocolo.",
      },
      {
        id: "curiosity",
        number: "02",
        title: "Curiosidad",
        description:
          "Las preguntas nuevas se convierten en hipótesis explícitas, controles posibles y criterios de interpretación antes del experimento.",
      },
      {
        id: "self-criticism",
        number: "03",
        title: "Autocrítica",
        description:
          "Revisamos supuestos, controles y análisis antes de atribuir una diferencia observada al mecanismo estudiado.",
      },
      {
        id: "responsibility",
        number: "04",
        title: "Responsabilidad",
        description:
          "Cada integrante documenta su trabajo, anticipa riesgos experimentales y comunica a tiempo cambios en los compromisos.",
      },
      {
        id: "teamwork",
        number: "05",
        title: "Trabajo en equipo",
        description:
          "Protocolos, decisiones y dificultades se comparten para que el conocimiento no dependa de una sola persona.",
      },
      {
        id: "growth",
        number: "06",
        title: "Rigor y desarrollo progresivo",
        description:
          "La autonomía aumenta con la experiencia demostrada; la supervisión y la revisión se ajustan a cada etapa de formación.",
      },
      {
        id: "learning-from-error",
        number: "07",
        title: "Aprender del error",
        description:
          "Los errores se registran, se analiza su causa y la corrección se incorpora al protocolo o al flujo de análisis.",
      },
    ],
  },
  outreach: {
    eyebrow: "Divulgación",
    title: "Respiración y cerebro, explicados con claridad",
    introduction:
      "Esta sección reunirá cápsulas breves sobre respiración, cerebro y neurociencia para público no especializado.",
    status: "forthcoming",
    statusTitle: "Contenidos en preparación",
    statusText:
      "Mientras preparamos y revisamos los primeros contenidos, puedes conocer nuestras líneas de investigación o enviarnos una consulta.",
    archive: {
      eyebrow: "Archivo público",
      title: "Ciencia para leer y conversar",
      introduction:
        "Artículos, recursos y actividades preparados por el laboratorio para comprender las preguntas que orientan su investigación.",
      publishedEntrySingular: "1 entrada publicada",
      publishedEntryPlural: "{count} entradas publicadas",
      emptyAsideText: "Respiración, cerebro y neurociencia explicados con claridad.",
      comingSoonLabel: "Próximamente",
      readLabel: "Leer entrada",
      articleLabel: "Artículo",
      eventLabel: "Actividad",
      resourceLabel: "Recurso",
    },
    entry: {
      section: "Divulgación científica",
      back: "Volver a divulgación",
      published: "Publicado",
      updated: "Actualizado",
      language: "Idioma",
      languageValue: "Español",
      editorial: "Nota editorial",
      editorialText: "Contenido preparado por el laboratorio para acercar su trabajo científico a públicos no especialistas.",
      more: "Seguir explorando",
      research: "Conocer la investigación",
      contact: "Conversar con el laboratorio",
      attachmentLabel: "Descargar documento asociado",
      pagesLabel: "páginas",
    },
    statusPrimaryAction: { label: "Explorar la investigación", page: "research" },
    statusSecondaryAction: { label: "Enviar una consulta", page: "contact" },
    instagramLabel: "Instagram del laboratorio",
    instagramHref: null,
    instagramStatus: "forthcoming",
  },
  contact: {
    eyebrow: "Contacto",
    title: "Hablemos de investigación y formación",
    introduction:
      "Escríbenos para conversar sobre colaboración científica, oportunidades de formación o consultas relacionadas con el laboratorio. Estamos en el Centro de Investigación e Innovación de la Universidad Autónoma de Chile, en Huechuraba.",
    asideLabel: "Respuesta directa",
    locationTitle: "Dónde estamos",
    institution: "Universidad Autónoma de Chile",
    center: "Centro de Investigación e Innovación",
    faculty: "Facultad de Ciencias de la Salud",
    laboratory: "Laboratorio de Fisiología · 3.er piso",
    streetAddress: "Av. del Valle 534, Huechuraba, Santiago, Chile",
    mapEyebrow: "Huechuraba · Santiago",
    mapTitle: "Ubicación del laboratorio",
    mapIframeTitle: "Mapa de ubicación de Díaz-Jara Lab",
    mapLoadLabel: "Cargar mapa interactivo",
    mapExternalLabel: "Abrir en Google Maps",
    mapQuery:
      "Universidad Autónoma de Chile Centro de Investigación e Innovación Av. del Valle 534 Huechuraba Santiago Chile",
    directEmailLabel: "Correo directo",
    email: "esteban.diaz@uautonoma.cl",
    form: {
      title: "Cuéntanos el motivo de tu consulta",
      introduction:
        "Incluye tu institución o etapa de formación, tus intereses y el tipo de colaboración u oportunidad que buscas.",
      nameLabel: "Nombre",
      namePlaceholder: "Tu nombre",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tu@correo.cl",
      messageLabel: "Mensaje",
      messagePlaceholder: "Ej. colaboración científica, interés en tesis o consulta general",
      submitLabel: "Enviar mensaje",
      submittingLabel: "Enviando…",
      successTitle: "Mensaje enviado",
      successMessage: "Gracias por escribirnos. Te responderemos pronto.",
      errorTitle: "No pudimos enviar el mensaje",
      errorMessage:
        "Inténtalo nuevamente o escríbenos directamente por correo electrónico.",
      requiredMessage: "Este campo es obligatorio.",
      invalidEmailMessage: "Ingresa un correo electrónico válido.",
      unavailableMessage:
        "El formulario aún no está habilitado. Puedes contactarnos mediante el correo directo.",
      fallbackHint: "Al enviar se abrirá tu aplicación de correo.",
      fallbackSubject: "Contacto desde diazjaralab.com",
      fallbackNameLabel: "Nombre",
      fallbackEmailLabel: "Email",
      honeypotLabel: "No completar este campo",
    },
    join: {
      eyebrow: "Formación e investigación",
      title: "Oportunidades para estudiantes e investigadores postdoctorales",
      paragraphs: [
        "Recibimos consultas de estudiantes de pregrado, magíster y doctorado, y de investigadores postdoctorales interesados en neurofisiología respiratoria.",
        "Al escribir, indica tu etapa de formación, experiencia relevante e intereses científicos. Las postulaciones pueden provenir de distintas áreas.",
        "La disponibilidad de posiciones y proyectos se confirma por correo electrónico.",
      ],
      actionLabel: "Consultar disponibilidad",
      emailSubject: "Interés en unirme al Díaz-Jara Lab",
    },
  },
  footer: {
    description:
      "Estudiamos la relación entre circuitos respiratorios, actividad cerebral, fisiología y enfermedad.",
    navigationLabel: "Navegación",
    contactLabel: "Contacto",
    location: "Santiago · Chile",
    affiliation:
      "Instituto de Ciencias Biomédicas · Universidad Autónoma de Chile",
    copyright: "© 2026 Díaz-Jara Lab. Todos los derechos reservados.",
  },
} as const satisfies SiteContent;
