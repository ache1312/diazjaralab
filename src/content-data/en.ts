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
    title: "How breathing rhythm is generated and regulated",
    summary:
      "We study how neurons and astrocytes generate and regulate breathing rhythm and cardiorespiratory homeostasis.",
    body:
      "We study how neurons and astrocytes in nuclei such as the nucleus tractus solitarius (NTS), the preBötzinger complex, the Kölliker-Fuse nucleus, and the retrotrapezoid nucleus (RTN) generate and regulate breathing rhythm and cardiorespiratory homeostasis. A particular focus of our work is the role of NTS astrocytes as active modulators, and not merely support cells, in the emergence of respiratory disorders during chronic intermittent hypoxia and following cortical ischemic stroke.",
    imageAlt:
      "Immunofluorescence micrograph acquired in the lab and shown in the fluorophores’ original colors.",
    figureCaption:
      "Immunofluorescence micrograph acquired by the lab. Channels are shown in their original acquisition colors; anatomy and scale will be documented with the associated experimental record.",
    question:
      "Which neuronal and astrocytic mechanisms sustain breathing rhythm and cardiorespiratory homeostasis?",
    hypothesis:
      "Astrocytes in respiratory nuclei actively regulate the circuit and contribute to its dysfunction in disease.",
    systems: ["NTS", "preBötzinger complex", "Kölliker-Fuse", "RTN"],
    measurements: ["Cardiorespiratory physiology", "Electrophysiology", "Microscopy"],
    status: "Active question · published background",
    relatedDois: ["10.1186/s40659-023-00463-0", "10.1152/ajplung.00280.2024"],
  },
  {
    id: "respiratory-neurodynamics",
    number: "02",
    title: "How breathing synchronizes brain networks",
    summary:
      "We investigate how respiratory oscillations synchronize cortical and hippocampal circuits.",
    body:
      "Breathing does more than maintain homeostasis: it also organizes brain activity. We investigate how respiratory oscillations synchronize cortical and hippocampal circuits, and how this synchronization relates to cognition, sleep, and learning. In our models of chronic intermittent hypoxia and ischemic stroke, we seek to understand how astrocyte-mediated dysfunction in brainstem respiratory nuclei reshapes connectivity across these circuits.",
    imageAlt:
      "Fluorescence image produced by the lab, with scientific signals displayed against a dark background.",
    figureCaption:
      "Fluorescence image produced by the lab. The multichannel acquisition is preserved; interpretation depends on the preparation and markers used in each experiment.",
    question:
      "How do respiratory oscillations couple with cortical and hippocampal activity?",
    hypothesis:
      "Respiratory dynamics provide a temporal reference for brain networks involved in sleep, learning, and cognition.",
    systems: ["Brainstem", "Cortex", "Hippocampus"],
    measurements: ["Multichannel LFP", "Respiratory signals", "Temporal analysis"],
    status: "Developing research line",
    relatedDois: ["10.1096/fasebj.2020.34.s1.05130", "10.1111/apha.13864"],
  },
  {
    id: "disease-neurophysiology",
    number: "03",
    title: "What changes in disease",
    summary:
      "We examine the two-way relationship between brain alterations, respiratory function, physiology, and cognition.",
    body:
      "Brain alterations can profoundly modify respiratory function, while respiratory dysfunction can, in turn, worsen the course of disease. We work with two models that address this bidirectional relationship: chronic intermittent hypoxia and cortical ischemic stroke. In both, we focus on how astrocyte-mediated alterations in respiratory nuclei affect physiology and cognition.",
    imageAlt:
      "Multichannel micrograph from the lab showing fluorescent signals against a black background.",
    figureCaption:
      "Multichannel micrograph acquired by the lab. It is presented as an experimental record without assigning markers or regions not confirmed in its metadata.",
    question:
      "How do breathing, brain activity, and disease progression modify one another?",
    hypothesis:
      "Glial alterations in respiratory nuclei may connect cardiorespiratory dysfunction with brain and cognitive changes.",
    systems: ["Chronic intermittent hypoxia", "Cortical ischemia", "Heart failure"],
    measurements: ["Ventilation", "Autonomic control", "Glial activity"],
    status: "Previous evidence · new models active",
    relatedDois: ["10.1016/j.ebiom.2022.104044", "10.1007/s00395-025-01154-5"],
  },
] as const satisfies readonly ResearchArea[];

const grants = [
  {
    id: "anid-installation-85250074",
    agency: "ANID · Academic Installation Project",
    number: "No. 85250074",
    title:
      "Academic installation of Dr. Esteban Díaz Jara… neural cardiorespiratory control in cardiometabolic and genetic diseases",
    officialTitle:
      "Instalación académica del Dr. Esteban Díaz Jara... control neural cardiorrespiratoria en enfermedades cardio-metabólicas y genéticas",
    officialLang: "es",
    principalInvestigatorLabel: "Principal investigator",
    principalInvestigator: "Dr. Esteban Díaz Jara",
    endDateLabel: "End date",
    endDate: "October 1, 2028",
    endDateIso: "2028-10-01",
    state: "published",
  },
  {
    id: "fondecyt-3260612",
    agency: "FONDECYT",
    number: "No. 3260612",
    title:
      "Astrocyte Activation in the Nucleus Tractus Solitarii Drives Cardiorespiratory Disorders in the Early Stages of Chronic Intermittent Hypoxia: The Role of Mitochondrial Oxidative Stress and Glutamate Spillover",
    officialTitle:
      "Astrocyte Activation in the Nucleus Tractus Solitarii Drives Cardiorespiratory Disorders in the Early Stages of Chronic Intermittent Hypoxia: The Role of Mitochondrial Oxidative Stress and Glutamate Spillover",
    officialLang: "en",
    principalInvestigatorLabel: "Principal investigator",
    principalInvestigator: "Dr. Esteban Díaz Jara",
    endDateLabel: "End date",
    endDate: "March 31, 2029",
    endDateIso: "2029-03-31",
    state: "published",
  },
] as const satisfies readonly Grant[];

const techniqueStages = [
  {
    id: "manipulate",
    number: "01",
    verb: "Manipulate",
    title: "Models and causality",
    description:
      "We generate disease models and manipulate specific circuits to test causal relationships among astrocytes, respiratory circuits, and disease.",
    items: [
      "Chronic intermittent hypoxia",
      "Cortical ischemic stroke",
      "Chemogenetics (DREADDs)",
    ],
    scope:
      "Preclinical models of chronic intermittent hypoxia and cortical ischemic stroke.",
    output:
      "Defined perturbations for testing causal relationships in circuits and cell populations.",
    accent: "amber",
  },
  {
    id: "measure",
    number: "02",
    verb: "Measure",
    title: "Physiology in real time",
    description:
      "We record respiratory, cardiorespiratory, and brain activity at high temporal resolution in awake animals.",
    items: [
      "Plethysmography",
      "Cardiorespiratory recording",
      "Advanced cardiorespiratory instrumentation",
      "Open Ephys",
      "Multichannel LFP (32 channels)",
    ],
    scope:
      "Awake animals, cardiorespiratory recordings, and 32-channel multichannel LFP.",
    output:
      "Synchronized time series of ventilation, cardiovascular variables, and neuronal activity.",
    accent: "teal",
  },
  {
    id: "visualize",
    number: "03",
    verb: "Visualize",
    title: "Cells and circuits",
    description:
      "We identify and characterize, in vitro, the cell populations involved in respiratory circuits.",
    items: [
      "Immunofluorescence",
      "Confocal microscopy",
      "Calcium imaging in brain slices",
    ],
    scope:
      "Immunofluorescence-labelled tissue and brain slices for in vitro studies.",
    output:
      "Cell distribution, morphology, and calcium signals in defined cells and circuits.",
    accent: "cyan",
  },
  {
    id: "analyze",
    number: "04",
    verb: "Analyze",
    title: "Signals and structure",
    description:
      "We extract interpretable structure from electrophysiological signals, images, and gene-expression data.",
    items: [
      "Python",
      "Signal analysis",
      "Data processing",
      "Machine learning",
      "Transcriptomic analysis",
    ],
    scope:
      "Electrophysiological signals, images, and gene-expression data.",
    output:
      "Reproducible metrics, temporal relationships, and interpretable multivariate patterns.",
    accent: "navy",
  },
] as const satisfies readonly TechniqueStage[];

const teamMembers = [
  {
    id: "esteban-diaz-jara",
    name: "Esteban Díaz Jara",
    group: "principal-investigator",
    role: "Principal investigator and associate professor",
    credentials: "Biochemist · Ph.D. in Biological Sciences, Physiology",
    institution: "Universidad Autónoma de Chile",
    bio: [
      "Esteban trained as a biochemist at Universidad Austral de Chile in Valdivia. He completed his undergraduate thesis under Felipe Barros at the Centro de Estudios Científicos (CECs), where he studied neuronal energy metabolism. He later moved to Santiago and worked with Juan Andrés Orellana on connexin- and pannexin-mediated glia–neuron communication.",
      "In 2019, he entered the Ph.D. program in Biological Sciences, with a specialization in Physiology, at Pontificia Universidad Católica de Chile. Under Rodrigo Del Río’s supervision, his doctoral research examined how astrocytic glutamate transporters in the retrotrapezoid nucleus contribute to central chemoreflex potentiation and respiratory disturbances in a model of heart failure with preserved ejection fraction.",
      "In mid-2025, he joined the Institute of Biomedical Sciences at Universidad Autónoma de Chile as an investigator and associate professor. In parallel, he is conducting postdoctoral research under Professor Rodrigo Iturriaga’s supervision.",
    ],
    research:
      "His work integrates cardiorespiratory physiology, astrocyte signaling, and circuit dynamics to understand how breathing interacts with the brain in health and disease.",
    portrait: "/images/team/esteban-diaz-jara.jpg",
    portraitAlt: "Portrait of Esteban Díaz Jara.",
    state: "published",
  },
  {
    id: "sinay-vicencio-orellana",
    name: "Sinay C. Vicencio Orellana",
    group: "coordination",
    role: "Lab manager and coordinator",
    credentials:
      "Biochemist · M.Sc. in Biological Sciences · Ph.D. candidate in Physiological Sciences",
    bio: [
      "Sinay is the lab manager of the Respiratory Neurodynamics Laboratory, led by Dr. Esteban Díaz Jara. Her background spans neurobiology and preclinical models of central nervous system myelin disorders, cardiorespiratory physiology, and translational medicine, with a particular interest in preventive medicine for healthy aging.",
      "In the lab, she combines logistics and experimental planning with hands-on work in molecular biology, physiology, and microscopy. She also coordinates project priorities and experimental schedules.",
    ],
    research:
      "She coordinates the lab’s scientific operations and contributes to molecular biology, physiology, and microscopy experiments.",
    portrait: "/images/team/sinay-vicencio-orellana.jpg",
    portraitAlt: "Portrait of Sinay C. Vicencio Orellana in the laboratory.",
    state: "published",
  },
  {
    id: "pablo-burgos",
    name: "Pablo Burgos",
    group: "graduate",
    role: "Graduate student",
    credentials: "Physicist · M.Sc. in Neuroscience",
    institution: "Universidad Autónoma de Chile",
    bio: ["Biography in preparation."],
    portrait: null,
    portraitAlt: null,
    state: "forthcoming",
    statusLabel: "Biography in preparation",
  },
  {
    id: "francisca-silva",
    name: "Francisca Silva",
    group: "graduate",
    role: "M.Sc. thesis student in Physiology and Pharmacology",
    credentials: "Master’s student",
    institution: "Universidad de Valparaíso",
    bio: ["Biography in preparation."],
    portrait: null,
    portraitAlt: null,
    state: "forthcoming",
    statusLabel: "Biography in preparation",
  },
  {
    id: "sebastian-cortes",
    name: "Sebastián Cortés",
    group: "undergraduate",
    role: "Undergraduate thesis student in Chemistry and Pharmacy",
    credentials: "Undergraduate student",
    institution: "Universidad Autónoma de Chile",
    bio: ["Biography in preparation."],
    portrait: null,
    portraitAlt: null,
    state: "forthcoming",
    statusLabel: "Biography in preparation",
  },
  {
    id: "fernanda-castillo",
    name: "Fernanda Castillo",
    group: "undergraduate",
    role: "Undergraduate thesis student in Chemistry and Pharmacy",
    credentials: "Undergraduate student",
    institution: "Universidad Autónoma de Chile",
    bio: ["Biography in preparation."],
    portrait: null,
    portraitAlt: null,
    state: "forthcoming",
    statusLabel: "Biography in preparation",
  },
] as const satisfies readonly TeamMember[];

export const enContent = {
  locale: "en",
  htmlLang: "en",
  languageName: "English",
  alternateLanguageLabel: "Español",
  routes: {
    home: "/en/",
    research: "/en/research/",
    techniques: "/en/techniques/",
    team: "/en/team/",
    publications: "/en/publications/",
    philosophy: "/en/philosophy/",
    outreach: "/en/outreach/",
    contact: "/en/contact/",
  },
  seo: {
    home: {
      title: "Respiratory Neurodynamics Laboratory | Díaz-Jara Lab",
      description:
        "A Universidad Autónoma de Chile laboratory studying how respiratory circuits and astrocytes influence brain activity, physiology, and disease.",
    },
    research: {
      title: "Research | Díaz-Jara Lab",
      description:
        "Research areas in respiratory circuits, neurodynamics, and the neurophysiology of disease.",
    },
    techniques: {
      title: "Techniques | Díaz-Jara Lab",
      description:
        "Methods for disease models, in vivo physiology, microscopy, electrophysiology, and computational analysis.",
    },
    team: {
      title: "Team | Díaz-Jara Lab",
      description:
        "Members of the Respiratory Neurodynamics Laboratory at Universidad Autónoma de Chile.",
    },
    publications: {
      title: "Publications | Díaz-Jara Lab",
      description:
        "Catalogue of 46 academic records attributed to Esteban Díaz-Jara, including 25 articles and reviews, cross-checked with Scholar and OpenAlex.",
    },
    philosophy: {
      title: "How we work | Díaz-Jara Lab",
      description:
        "Honesty, curiosity, critical self-reflection, responsibility, and teamwork guide the way we do science.",
    },
    outreach: {
      title: "Outreach | Díaz-Jara Lab",
      description:
        "Accessible stories about breathing, the brain, and neuroscience for non-specialist audiences.",
    },
    contact: {
      title: "Contact | Díaz-Jara Lab",
      description:
        "Contact or visit the Respiratory Neurodynamics Laboratory in Huechuraba, Santiago, Chile.",
    },
  },
  brand: {
    name: "Díaz-Jara Lab",
    scientificName: "Respiratory Neurodynamics Laboratory",
    shortDescription: "Breathing, brain circuits, and disease.",
    logoAlt: "Díaz-Jara Lab, Respiratory Neurodynamics Laboratory",
  },
  navigation: {
    ariaLabel: "Main navigation",
    openMenuLabel: "Open menu",
    closeMenuLabel: "Close menu",
    laboratoryMenuLabel: "Laboratory",
    languageSwitcherLabel: "Change language",
    items: [
      { page: "research", label: "Research", menu: "primary" },
      { page: "techniques", label: "Techniques", menu: "primary" },
      { page: "team", label: "Team", menu: "primary" },
      { page: "publications", label: "Publications", menu: "primary" },
      { page: "philosophy", label: "Lab practices", menu: "laboratory" },
      { page: "outreach", label: "Outreach", menu: "laboratory" },
      { page: "contact", label: "Contact", menu: "primary" },
    ],
  },
  common: {
    skipToContent: "Skip to content",
    readMore: "Read more",
    learnMore: "More information",
    backToHome: "Back to home",
    stateLabels: {
      published: "Published",
      forthcoming: "In preparation",
    },
  },
  home: {
    eyebrow: "Respiratory Neurodynamics · Universidad Autónoma de Chile",
    title: "Neural and glial control of breathing",
    introduction:
      "We investigate how brainstem neurons and astrocytes regulate breathing, and how these signals relate to physiology, cognition, and disease.",
    affiliation: "Institute of Biomedical Sciences",
    location: "Huechuraba · Santiago, Chile",
    primaryAction: { label: "Research areas", page: "research" },
    secondaryAction: { label: "Publications", page: "publications" },
    heroActionsLabel: "Scientific links",
    heroFacts: [
      { label: "Focus", value: "Brainstem neurons and astrocytes" },
      { label: "Models", value: "Intermittent hypoxia and cortical ischemia" },
      { label: "Measurements", value: "Physiology, electrophysiology, and microscopy" },
    ],
    heroImageAlt:
      "Immunofluorescence micrograph from the lab showing green, red, cyan, and blue signals against a black background.",
    heroImageCaption:
      "DJL-IMG-H01 · Multichannel acquisition · Anatomy and scale under verification",
    media: {
      hero: "science-rvlm-network",
      registerOne: "science-rvlm-astrocytes",
      registerTwo: "science-nts-gfap",
      registerThree: "science-cih-iba1",
      teamEsteban: "team-esteban-diaz-jara",
      teamSinay: "team-sinay-vicencio",
    },
    publicEntry: {
      eyebrow: "A place to begin",
      title: "Breathing feels automatic. For the brain, it is a task coordinated second by second.",
      introduction:
        "As we sleep, walk, or exercise, the body’s needs change. Brain circuits receive that information and adjust the breathing rhythm without requiring conscious thought.",
      body: [
        "Part of this work takes place in the brainstem, where neurons and astrocytes participate in networks that generate and modulate breathing. Dr. Esteban Díaz Jara studies how these cells coordinate and how their signals relate to respiratory, cardiovascular, and brain activity.",
        "The laboratory examines what changes during intermittent hypoxia or after ischemic brain injury. To follow the process from the cell to the whole organism, it combines physiology, electrophysiology, microscopy, and data analysis.",
      ],
      questionLabel: "The question connecting the work",
      question:
        "How does coordination among cells and respiratory circuits change before disruption becomes visible across the whole organism?",
      glossaryLabel: "Three concepts for reading this site",
      glossary: [
        {
          term: "Brainstem",
          definition:
            "The region linking the brain and spinal cord, involved in essential automatic functions, including breathing.",
        },
        {
          term: "Astrocyte",
          definition:
            "A glial cell that maintains the neuronal environment and also participates in communication within neural circuits.",
        },
        {
          term: "Preclinical model",
          definition:
            "An experimental system used to test a biological mechanism; its results do not translate directly to what occurs in patients.",
        },
      ],
      scopeLabel: "Scope",
      scope:
        "These studies seek to understand biological mechanisms. They do not provide diagnoses or medical advice, and a hypothesis remains identified as such until evidence allows it to be evaluated.",
      linksLabel: "Continue according to what you want to explore",
      links: [
        { label: "Understand the questions", page: "research" },
        { label: "See how we investigate", page: "techniques" },
        { label: "Meet the team", page: "team" },
      ],
    },
    imageRegister: {
      label: "DJL / IMAGE REGISTER / 01–03",
      title: "Images treated as evidence, not decoration",
      introduction:
        "These acquisitions are shown in their original channels. Anatomy, markers, and scale are attributed only when the associated experimental record supports them.",
      statusLabel: "Record status",
      status: "Provisional description",
      criterionLabel: "Publication criterion",
      criterion:
        "Do not infer cell identity, anatomical region, or scale from an isolated image.",
      figures: [
        {
          code: "DJL-IMG-01",
          title: "Multichannel field 01",
          note: "Immunofluorescence · original channels",
          alt: "Multichannel experimental field with green, magenta, and blue signals against a black background.",
        },
        {
          code: "DJL-IMG-02",
          title: "Multichannel field 02",
          note: "Tissue record · metadata under verification",
          alt: "Experimental field with green structures and blue nuclei against a black background.",
        },
        {
          code: "DJL-IMG-03",
          title: "Multichannel field 03",
          note: "Tissue record · scale under verification",
          alt: "Experimental field with magenta structures and blue nuclei against a black background.",
        },
      ],
    },
    researchEyebrow: "Research",
    researchTitle: "Three questions organizing our current work",
    researchIntroduction:
      "From cellular mechanisms to cognition, we study how breathing is generated, how it synchronizes other brain networks, and what changes in disease.",
    researchAreas,
    pipelineEyebrow: "Methods",
    pipelineTitle: "From perturbation to an interpretable record",
    pipelineIntroduction:
      "We combine disease models, physiological recordings in awake animals, microscopy, electrophysiology, and computational analysis to connect cellular changes with cardiorespiratory and brain activity.",
    pipelineStages: [
      { id: "manipulate", number: "01", verb: "Manipulate" },
      { id: "measure", number: "02", verb: "Measure" },
      { id: "visualize", number: "03", verb: "Visualize" },
      { id: "analyze", number: "04", verb: "Analyze" },
    ],
    fundingEyebrow: "Current funding",
    fundingTitle: "ANID and FONDECYT projects",
    fundingIntroduction:
      "The program receives funding to investigate neural cardiorespiratory control and astrocyte signaling.",
    publicationsEyebrow: "Scientific record",
    publicationsTitle: "Recent publications",
    publicationsIntroduction:
      "A selection of recent papers from Esteban Díaz-Jara’s scientific record. Each entry links to its editorial source, while the catalog preserves its bibliographic provenance.",
    publicationsActionLabel: "Explore all publications",
    publicationLinkLabel: "Open publication",
    openAccessLabel: "Open access",
    singleCitationLabel: "Scholar citation",
    citationsLabel: "Scholar citations",
    publicationAuthorsContinuation: "et al.",
    teamEyebrow: "Team",
    teamTitle: "People and experimental work",
    teamIntroduction:
      "Esteban Díaz Jara leads the scientific program; Sinay C. Vicencio Orellana coordinates laboratory operations and contributes to molecular biology, physiology, and microscopy.",
    teamPortraitAlt: {
      principalInvestigator: "Portrait of Esteban Díaz Jara",
      laboratoryCoordinator: "Portrait of Sinay C. Vicencio Orellana",
    },
    teamActionLabel: "View profiles and roles",
    joinEyebrow: "Theses · collaboration · training",
    joinTitle: "Scientific conversations around a concrete problem",
    joinIntroduction:
      "We can talk with students and researchers who bring a defined question in respiratory neurophysiology, astrocyte signaling, microscopy, or computational analysis.",
    joinAction: { label: "Contact information", page: "contact" },
  },
  research: {
    eyebrow: "Research",
    title: "Respiratory circuits, astrocytes, and disease",
    introduction:
      "We investigate how brainstem respiratory circuits interact with the brain networks that sustain physiology, behavior, and disease. Our work is organized around three complementary questions, moving from cellular mechanisms to their impact on brain function.",
    media: {
      brainstemCircuits: "science-rvlm-astrocytes",
      respiratoryNeurodynamics: "science-nts-gfap",
      diseaseNeurophysiology: "science-cih-iba1",
    },
    asideLabel: "Scale of inquiry",
    asideText: "Cellular mechanisms → circuits → physiology and cognition.",
    questionLabel: "Question",
    hypothesisLabel: "Working hypothesis",
    systemsLabel: "Systems",
    measurementsLabel: "Measurements",
    contextLabel: "Context and scope",
    relatedEvidenceLabel: "Related evidence",
    areas: researchAreas,
    fundingEyebrow: "Funding",
    fundingTitle: "Current projects",
    fundingIntroduction:
      "These initiatives support the development of the laboratory and studies of cardiorespiratory control, astrocytes, and disease.",
    grants,
  },
  techniques: {
    eyebrow: "Techniques",
    title: "Experimental design and methodological capabilities",
    introduction:
      "We organize our capabilities around the actual progression of scientific work: we generate and manipulate models, measure physiology, visualize cells and circuits, and analyze the resulting data.",
    railLabel: "Experimental pipeline",
    asideText: "Each stage answers one part of the same scientific question.",
    scopeLabel: "System or sample",
    outputLabel: "Experimental output",
    methodsLabel: "Methods and resources",
    stages: techniqueStages,
    closingEyebrow: "Integration",
    closingTitle: "Integrated methods",
    closingText:
      "By integrating in vivo physiology, microscopy, electrophysiology, and computational analysis, we can connect cellular changes with cardiorespiratory patterns and brain activity.",
  },
  team: {
    eyebrow: "Team",
    title: "Research team",
    introduction:
      "The team includes researchers and students trained in physiology, neurobiology, microscopy, and data analysis.",
    asideLabel: "How we work",
    asideText: "Autonomy, collaboration, curiosity, and rigor.",
    scientificResponsibilityLabel: "Scientific responsibility",
    profileLinksLabel: "Esteban Díaz Jara academic profiles",
    media: {
      estebanDiazJara: "team-esteban-diaz-jara",
      sinayVicencio: "team-sinay-vicencio",
    },
    groups: [
      { id: "principal-investigator", label: "Principal investigator" },
      { id: "coordination", label: "Coordination" },
      { id: "graduate", label: "Graduate students" },
      { id: "undergraduate", label: "Undergraduate students" },
    ],
    members: teamMembers,
  },
  publications: {
    eyebrow: "Publications",
    title: "Scientific record of the principal investigator",
    introduction:
      "The catalog brings together work attributed to Esteban Díaz-Jara on neuroglia, chemoreception, and cardiorespiratory control. Each record preserves links to its academic sources for review.",
    profilesTitle: "Academic profiles",
    profiles: [
      { id: "openalex", label: "OpenAlex", href: "https://openalex.org/A5103209783", state: "published" },
      {
        id: "google-scholar",
        label: "Google Scholar",
        href: "https://scholar.google.com/citations?user=aREuxgcAAAAJ&hl=en",
        state: "published",
      },
    ],
    status: "published",
    statusTitle: "Sources and integration criteria",
    statusText:
      "This reconstruction is putative: it combines matches by DOI, title, co-authorship, and research trajectory. Every record links back to its sources so the author can review it. Differences between online-first and volume year were resolved with Crossref when available.",
    emptyListLabel: "No records match this search.",
    metrics: {
      ariaLabel: "Bibliometric summary",
      papers: "Articles and review",
      works: "Canonical works",
      citations: "Scholar citations",
      hIndex: "h-index",
      openAccess: "Open access",
    },
    network: {
      eyebrow: "Bibliographic network",
      title: "Relationships among publications and research topics",
      introduction:
        "The network includes {papers} visible articles and reviews from the catalogue, organized into {topics} topics. Edges are estimated from shared OpenAlex references, co-authorship, and temporal proximity. Hover or use the keyboard to preview; select a node to keep it in focus.",
      papers: "publications",
      themes: "topics",
      contentsLabel: "Network contents",
      graphLabel: "Interactive network of publications and research topics",
      focusLabel: "Filter by relationships with reference publications",
      complete: "Complete view",
      export: "Download BibTeX",
      paperLegend: "Teal node: publication",
      sizeLegend: "Size: Google Scholar citations",
      recentLegend: "Brightness: publication year",
      relationLegend: "Teal line · weight and opacity: bibliographic affinity",
      selectedPaper: "Publication in focus",
      selectedTheme: "Topic in focus",
      citations: "citations",
      topicHeading: "Assigned topics",
      connectedHeading: "Bibliographic connections",
      connectionOrder: "Ordered by connection weight; citations and recency break ties. This is not a quality ranking.",
      exploreConnection: "Focus in the network",
      noConnections: "No related publications are available in this view.",
      source: "Open source record",
      catalogue: "View catalogue record",
      inferredTheme: "Topic inferred from the publication corpus",
      themeNote: "An editorial classification for exploration; it is not a bibliometric category.",
      method:
        "Exploratory model. Relationships are not a bibliometric assessment and can be checked against the linked sources.",
      nodePaper: "Publication",
      nodeTheme: "Topic",
      legendLabel: "Network legend",
    },
    catalogue: {
      eyebrow: "Complete catalogue",
      title: "Academic output of Esteban Díaz-Jara",
      introduction:
        "This catalogue cross-references the public Google Scholar profile with five OpenAlex author identities, removes editorial duplicates, and retains abstracts, corrections, chapters, and the thesis as separate records.",
      filterLabel: "Filter publications",
      filterArticles: "Articles",
      filterAbstracts: "Abstracts",
      filterOther: "Other",
      filterAll: "All",
      searchLabel: "Search by title, author, or journal",
      searchPlaceholder: "E.g. astrocytes, heart failure…",
      sortLabel: "Sort",
      sortCurated: "Lab selection",
      sortNewest: "Newest first",
      sortCited: "Most cited",
      sortOldest: "Oldest first",
      topicLabel: "Research topic",
      topicAll: "All topics",
      featured: "Lab selection",
      shown: "visible records",
      citedBy: "citations",
      scholar: "Scholar",
      openAlex: "OpenAlex",
      doi: "DOI",
      openAccess: "Open text",
      sourceCrossed: "Scholar + OpenAlex",
      sourceScholar: "Scholar only",
      downloadBib: "Download BibTeX",
      scholarOnlyNote:
        "Oral presentation OS 14-05, IUPS 2025; no DOI or OpenAlex record was located.",
      backToFilters: "Back to filters",
    },
    typeLabels: {
      journalArticle: "Article",
      review: "Review",
      conferenceAbstract: "Conference abstract",
      conferenceProceedingsChapter: "Chapter / proceedings",
      correction: "Correction",
      doctoralThesis: "Doctoral thesis",
    },
    provenance: {
      eyebrow: "Data provenance",
      updatedLabel: "Updated",
      sourcesLabel: "Sources consulted",
      sources: [
        { label: "Google Scholar", href: "https://scholar.google.com/citations?user=aREuxgcAAAAJ&hl=en" },
        { label: "OpenAlex", href: "https://openalex.org/A5103209783" },
        { label: "Crossref", href: "https://www.crossref.org/" },
        { label: "IUPS 2025", href: "https://www.iups.org/wp-content/uploads/2025/08/programme-2025-08-22.pdf" },
      ],
    },
  },
  philosophy: {
    eyebrow: "Laboratory practices",
    title: "How we record, review, and learn",
    introduction:
      "Operational criteria for recording data, reviewing results, training researchers, and coordinating experimental work.",
    asideLabel: "Scope",
    asideText: "Data · training · collaboration",
    generalCriterionLabel: "General criterion",
    statement:
      "Honesty with data, one’s own work, and the team is a central principle of the laboratory. We maintain high standards and recognize that scientific training requires time, supervision, and progressive autonomy. Curiosity and critical self-reflection guide experimental design and the interpretation of results. Each member develops an individual project with personal responsibility and day-to-day collaboration; mistakes are analyzed to correct procedures and support learning.",
    missionLabel: "Mission",
    mission:
      "To investigate how brainstem respiratory circuits interact with brain networks in order to understand physiology, behavior, and disease, while training researchers who are honest, independent, self-critical, and able to work as part of a team.",
    visionLabel: "Vision",
    vision:
      "To consolidate a respiratory neurodynamics research program in Latin America that produces reproducible knowledge and trains researchers who are principled, independent, and rigorous.",
    valuesEyebrow: "How we work",
    valuesTitle: "Observable working criteria",
    valuesIntroduction:
      "Each principle is expressed as observable conduct in day-to-day work.",
    values: [
      {
        id: "honesty",
        number: "01",
        title: "Honesty",
        description:
          "We record expected and unexpected results, preserve original data, and report deviations from protocol.",
      },
      {
        id: "curiosity",
        number: "02",
        title: "Curiosity",
        description:
          "New questions become explicit hypotheses, possible controls, and interpretation criteria before the experiment.",
      },
      {
        id: "self-criticism",
        number: "03",
        title: "Critical self-reflection",
        description:
          "We review assumptions, controls, and analyses before assigning an observed difference to the mechanism under study.",
      },
      {
        id: "responsibility",
        number: "04",
        title: "Responsibility",
        description:
          "Each member documents their work, anticipates experimental risks, and communicates changes in commitments early.",
      },
      {
        id: "teamwork",
        number: "05",
        title: "Teamwork",
        description:
          "Protocols, decisions, and difficulties are shared so that knowledge does not depend on one person.",
      },
      {
        id: "growth",
        number: "06",
        title: "Rigor and progressive development",
        description:
          "Autonomy increases with demonstrated experience; supervision and review are adjusted to each training stage.",
      },
      {
        id: "learning-from-error",
        number: "07",
        title: "Learning from mistakes",
        description:
          "Errors are recorded, their cause is examined, and corrections are incorporated into the protocol or analysis workflow.",
      },
    ],
  },
  outreach: {
    eyebrow: "Outreach",
    title: "Breathing and the brain, explained clearly",
    introduction:
      "This section will bring together short pieces about breathing, the brain, and neuroscience for non-specialist audiences.",
    status: "forthcoming",
    statusTitle: "Content in preparation",
    statusText:
      "While we prepare and review the first pieces, you can explore our research areas or send us an inquiry.",
    archive: {
      eyebrow: "Public archive",
      title: "Science to read and discuss",
      introduction:
        "Articles, resources, and activities prepared by the laboratory to make the questions guiding its research easier to understand.",
      publishedEntrySingular: "1 published entry",
      publishedEntryPlural: "{count} published entries",
      emptyAsideText: "Breathing, brain, and neuroscience explained with clarity.",
      comingSoonLabel: "Coming soon",
      readLabel: "Read entry",
      articleLabel: "Article",
      eventLabel: "Event",
      resourceLabel: "Resource",
    },
    entry: {
      section: "Scientific outreach",
      back: "Back to outreach",
      published: "Published",
      updated: "Updated",
      language: "Language",
      languageValue: "English",
      editorial: "Editorial note",
      editorialText: "Content prepared by the laboratory to make its scientific work accessible to non-specialist audiences.",
      more: "Keep exploring",
      research: "Explore the research",
      contact: "Talk to the laboratory",
      attachmentLabel: "Download associated document",
      pagesLabel: "pages",
    },
    statusPrimaryAction: { label: "Explore our research", page: "research" },
    statusSecondaryAction: { label: "Send an inquiry", page: "contact" },
    instagramLabel: "Laboratory Instagram",
    instagramHref: null,
    instagramStatus: "forthcoming",
  },
  contact: {
    eyebrow: "Contact",
    title: "Let’s talk about research and training",
    introduction:
      "Write to us about scientific collaboration, training opportunities, or questions related to the laboratory. We are based at the Research and Innovation Center of Universidad Autónoma de Chile in Huechuraba.",
    asideLabel: "Direct response",
    locationTitle: "Where to find us",
    institution: "Universidad Autónoma de Chile",
    center: "Research and Innovation Center",
    faculty: "Faculty of Health Sciences",
    laboratory: "Physiology Laboratory · 3rd floor",
    streetAddress: "Av. del Valle 534, Huechuraba, Santiago, Chile",
    mapEyebrow: "Huechuraba · Santiago",
    mapTitle: "Laboratory location",
    mapIframeTitle: "Díaz-Jara Lab location map",
    mapLoadLabel: "Load interactive map",
    mapExternalLabel: "Open in Google Maps",
    mapQuery:
      "Universidad Autónoma de Chile Centro de Investigación e Innovación Av. del Valle 534 Huechuraba Santiago Chile",
    directEmailLabel: "Direct email",
    email: "esteban.diaz@uautonoma.cl",
    form: {
      title: "Tell us what you would like to discuss",
      introduction:
        "Include your institution or training stage, your interests, and the kind of collaboration or opportunity you are looking for.",
      nameLabel: "Name",
      namePlaceholder: "Your name",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      messageLabel: "Message",
      messagePlaceholder: "E.g. scientific collaboration, thesis interest, or general inquiry",
      submitLabel: "Send message",
      submittingLabel: "Sending…",
      successTitle: "Message sent",
      successMessage: "Thank you for writing to us. We will reply soon.",
      errorTitle: "We could not send your message",
      errorMessage: "Please try again or contact us directly by email.",
      requiredMessage: "This field is required.",
      invalidEmailMessage: "Enter a valid email address.",
      unavailableMessage:
        "The form is not enabled yet. You can contact us using the direct email link.",
      fallbackHint: "Submitting will open your email application.",
      fallbackSubject: "Message from diazjaralab.com",
      fallbackNameLabel: "Name",
      fallbackEmailLabel: "Email",
      honeypotLabel: "Do not fill out this field",
    },
    join: {
      eyebrow: "Training and research",
      title: "Opportunities for students and postdoctoral researchers",
      paragraphs: [
        "We welcome inquiries from undergraduate, master’s, and doctoral students, as well as postdoctoral researchers interested in respiratory neurophysiology.",
        "When writing, indicate your training stage, relevant experience, and scientific interests. Applicants may come from different academic backgrounds.",
        "Availability of positions and projects is confirmed by email.",
      ],
      actionLabel: "Ask about availability",
      emailSubject: "Interest in joining the Díaz-Jara Lab",
    },
  },
  footer: {
    description:
      "We study relationships among respiratory circuits, brain activity, physiology, and disease.",
    navigationLabel: "Navigation",
    contactLabel: "Contact",
    location: "Santiago · Chile",
    affiliation: "Institute of Biomedical Sciences · Universidad Autónoma de Chile",
    copyright: "© 2026 Díaz-Jara Lab. All rights reserved.",
  },
} as const satisfies SiteContent;
