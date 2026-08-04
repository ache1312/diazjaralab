import { defineConfig, type Template, type TinaField } from "tinacms";
import publicationCatalogDocument from "../src/content-data/publications.generated.json";
import { configureStudioCms } from "./admin/cms-shell";
import { StructuralBlockNotice } from "./admin/fields";

const PAGE_ROUTES = {
  home: { es: "/", en: "/en/" },
  research: { es: "/investigacion/", en: "/en/research/" },
  techniques: { es: "/tecnicas/", en: "/en/techniques/" },
  team: { es: "/equipo/", en: "/en/team/" },
  publications: { es: "/publicaciones/", en: "/en/publications/" },
  philosophy: { es: "/filosofia/", en: "/en/philosophy/" },
  outreach: { es: "/divulgacion/", en: "/en/outreach/" },
  contact: { es: "/contacto/", en: "/en/contact/" },
} as const;

const TOPIC_IDS = [
  "cardiorespiratory-control",
  "neuroglia-signalling",
  "hypoxia-cardiovascular",
  "stress-adaptation",
] as const;

const TOPIC_COLORS = ["#60b8c3", "#e0a660", "#79a8c8", "#c48282"];
const TOPIC_LABELS: Readonly<Record<(typeof TOPIC_IDS)[number], string>> = {
  "cardiorespiratory-control": "Control cardiorrespiratorio y quimiorreflejo",
  "neuroglia-signalling": "Neuroglía y señalización celular",
  "hypoxia-cardiovascular": "Hipoxia y enfermedad cardiovascular",
  "stress-adaptation": "Estrés celular y adaptación",
};
const PUBLICATION_RECORDS = publicationCatalogDocument.works.flatMap((work) => {
  const publicationId = work.openalex_id?.split("/").at(-1);
  return publicationId
    ? [{ publicationId, doi: work.doi, title: work.title, year: work.display_year_recommended }]
    : [];
});
const PUBLICATION_BY_ID = new Map(PUBLICATION_RECORDS.map((record) => [record.publicationId, record]));
const PUBLICATION_OPTIONS = PUBLICATION_RECORDS.map((record) => ({
  label: `${record.year} · ${record.title}${record.doi ? ` · ${record.doi}` : ""}`,
  value: record.publicationId,
}));

const PAGE_BLOCK_TYPES = {
  home: ["hero", "publicEntry", "researchPreview", "imageRegister", "techniquesPreview", "fundingPreview", "publicationsPreview", "teamPreview", "callToAction"],
  research: ["hero", "researchAreas", "funding"],
  techniques: ["hero", "techniqueStages", "closing"],
  team: ["hero", "teamDirectory"],
  publications: ["hero", "publicationNetwork", "publicationCatalog", "provenance"],
  philosophy: ["hero", "statement", "values"],
  outreach: ["hero", "outreachFeed", "status"],
  contact: ["hero", "contactDetails", "contactForm", "map", "callToAction"],
} as const;

const LOCKED_BLOCK_TYPES = new Set<string>([
  "hero",
  "researchAreas",
  "techniqueStages",
  "teamDirectory",
  "publicationNetwork",
  "publicationCatalog",
  "statement",
  "values",
  "contactDetails",
  "contactForm",
]);

const hiddenString = (name: string, label: string): TinaField => ({
  type: "string",
  name: name === "id" ? "custom_id" : name,
  nameOverride: name === "id" ? "id" : undefined,
  label,
  ui: { component: null },
});

const hiddenNumber = (name: string, label: string): TinaField => ({
  type: "number",
  name,
  label,
  ui: { component: null },
});

const entityOrderField: TinaField = {
  type: "number",
  name: "order",
  label: "Orden de aparición",
  description: "Los números menores aparecen primero. Si se repite, se usa el nombre del archivo.",
};

const entityFilename = {
  parse: (value: string) =>
    value.toLocaleLowerCase("en").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""),
};

const text = (
  name: string,
  label: string,
  options: { required?: boolean; long?: boolean; list?: boolean } = {},
): TinaField => ({
  type: "string",
  name,
  label,
  required: options.required,
  list: options.list ? true : undefined,
  ui: options.long ? { component: "textarea" } : undefined,
});

const localizedText = (
  name: string,
  label: string,
  options: { required?: boolean; long?: boolean } = {},
): TinaField => ({
  type: "object",
  name,
  label,
  fields: [
    text("es", "Español", options),
    text("en", "Inglés", options),
  ],
});

const mediaReference = (
  name: string,
  label: string,
  kinds: readonly ("micrograph" | "photograph" | "figure" | "logo" | "document")[],
): TinaField => ({
  type: "reference",
  name,
  label,
  collections: ["media"],
  ui: {
    description: "Selecciona una imagen o un documento ya incorporado al sitio.",
    collectionFilter: {
      media: {
        kind: [...kinds],
        status: ["metadata-pending", "ready"],
      },
    },
  },
});

const pageMediaGroup = (fields: TinaField[]): TinaField => ({
  type: "object",
  name: "media",
  label: "Imágenes y documentos",
  description: "Elige los archivos que aparecen en esta página.",
  fields,
});

const actionFields: TinaField[] = [
  text("label", "Texto del enlace", { required: true }),
  {
    type: "string",
    name: "page",
    label: "Página de destino",
    required: true,
    options: [
      { label: "Inicio", value: "home" },
      { label: "Investigación", value: "research" },
      { label: "Técnicas", value: "techniques" },
      { label: "Equipo", value: "team" },
      { label: "Publicaciones", value: "publications" },
      { label: "Cómo trabajamos", value: "philosophy" },
      { label: "Divulgación", value: "outreach" },
      { label: "Contacto", value: "contact" },
    ],
  },
];

const heroFields: TinaField[] = [
  text("eyebrow", "Contexto breve", { required: true }),
  text("title", "Título principal", { required: true }),
  text("introduction", "Introducción", { required: true, long: true }),
];

const blockDefinitions = [
  ["hero", "Portada principal", ["immersive", "editorial"]],
  ["publicEntry", "Entrada para la sociedad", ["editorial"]],
  ["researchPreview", "Vista previa de investigación", ["chapters"]],
  ["imageRegister", "Registro de imágenes", ["scientific-register"]],
  ["techniquesPreview", "Vista previa de técnicas", ["pipeline"]],
  ["fundingPreview", "Vista previa de financiamiento", ["register"]],
  ["publicationsPreview", "Publicaciones recientes", ["list"]],
  ["teamPreview", "Vista previa del equipo", ["portrait-led"]],
  ["callToAction", "Llamado final", ["quiet"]],
  ["researchAreas", "Áreas de investigación", ["chapters"]],
  ["funding", "Financiamiento", ["register"]],
  ["techniqueStages", "Etapas metodológicas", ["pipeline"]],
  ["closing", "Cierre", ["quiet"]],
  ["teamDirectory", "Directorio del equipo", ["grouped"]],
  ["publicationNetwork", "Grafo de publicaciones", ["network"]],
  ["publicationCatalog", "Catálogo de publicaciones", ["list"]],
  ["provenance", "Procedencia bibliográfica", ["register"]],
  ["statement", "Declaración científica", ["prose"]],
  ["values", "Valores del laboratorio", ["numbered"]],
  ["outreachFeed", "Contenidos de divulgación", ["list"]],
  ["status", "Estado editorial", ["quiet"]],
  ["contactDetails", "Datos de contacto", ["split"]],
  ["contactForm", "Formulario", ["form"]],
  ["map", "Mapa", ["map"]],
] as const;

const BLOCK_VARIANT_BY_TYPE = new Map<string, string>(
  blockDefinitions.map(([name, , variants]) => [name, variants[0]]),
);

const blockTemplates: Template[] = blockDefinitions.map(([name, label, variants]) => ({
  name: name as string,
  label: label as string,
  ui: {
    itemProps: (item) => ({
      label: LOCKED_BLOCK_TYPES.has(name as string)
        ? `${label as string} · fija`
        : `${label as string} · ${item.enabled === false ? "oculta" : "visible"}`,
    }),
  },
  fields: [
    hiddenString("id", "ID estable"),
    {
      type: "boolean",
      name: "enabled",
      label: LOCKED_BLOCK_TYPES.has(name as string) ? "Sección estructural visible" : "Mostrar sección",
      description: name === "hero"
        ? "La portada siempre permanece visible. Usa el botón para editar su contexto, título e introducción."
        : "Esta sección siempre permanece visible. Usa el botón para editar su contenido.",
      ui: {
        component: LOCKED_BLOCK_TYPES.has(name as string) ? StructuralBlockNotice : undefined,
        validate: (value, values) =>
          values.locked && value === false
            ? "Este bloque es estructural y no se puede ocultar."
            : undefined,
      },
    },
    { type: "boolean", name: "locked", label: "Protegido", ui: { component: null } },
    { type: "number", name: "order", label: "Orden", ui: { component: null } },
    hiddenString("variant", `Presentación protegida · ${variants.join(" / ")}`),
  ],
}));

const blocksField = (allowedBlocks: readonly string[]): TinaField => ({
  type: "object",
  name: "blocks",
  label: "Orden y visibilidad",
  description: "Arrastra para ordenar. Las secciones fijas siempre permanecen visibles.",
  list: true,
  required: true,
  templateKey: "type",
  templates: blockTemplates.filter((template) => allowedBlocks.includes(template.name)),
  ui: {
    visualSelector: true,
    min: allowedBlocks.length,
    max: allowedBlocks.length,
  },
});

const seoField: TinaField = {
  type: "object",
  name: "seo",
  label: "Buscadores y redes",
  description: "Controla el título y el resumen que aparecen al buscar o compartir la página.",
  fields: [
    {
      type: "object",
      name: "es",
      label: "Español",
      fields: [
        text("title", "Título SEO", { required: true }),
        text("description", "Descripción SEO", { required: true, long: true }),
      ],
    },
    {
      type: "object",
      name: "en",
      label: "Inglés",
      fields: [
        text("title", "SEO title", { required: true }),
        text("description", "SEO description", { required: true, long: true }),
      ],
    },
  ],
};

const publicEntryFields: TinaField[] = [
  ...heroFields,
  { type: "string", name: "body", label: "Párrafos", list: true, required: true, ui: { component: "textarea", min: 1 } },
  text("questionLabel", "Etiqueta de la pregunta", { required: true }),
  text("question", "Pregunta articuladora", { required: true, long: true }),
  text("glossaryLabel", "Título del glosario", { required: true }),
  {
    type: "object",
    name: "glossary",
    label: "Conceptos",
    list: true,
    required: true,
    ui: { min: 2, max: 6, itemProps: (item) => ({ label: item.term || "Concepto" }) },
    fields: [
      text("term", "Término", { required: true }),
      text("definition", "Definición", { required: true, long: true }),
    ],
  },
  text("scopeLabel", "Etiqueta de alcance", { required: true }),
  text("scope", "Alcance y límites", { required: true, long: true }),
  text("linksLabel", "Etiqueta de enlaces", { required: true }),
  { type: "object", name: "links", label: "Enlaces", list: true, fields: actionFields, ui: { min: 1, max: 4 } },
];

const homeContentFields: TinaField[] = [
  ...heroFields,
  text("affiliation", "Afiliación", { required: true }),
  text("location", "Ubicación", { required: true }),
  { type: "object", name: "primaryAction", label: "Acción principal", fields: actionFields },
  { type: "object", name: "secondaryAction", label: "Acción secundaria", fields: actionFields },
  text("heroActionsLabel", "Etiqueta accesible de los enlaces", { required: true }),
  {
    type: "object",
    name: "heroFacts",
    label: "Datos clave de la portada",
    list: true,
    required: true,
    ui: {
      min: 3,
      max: 3,
      itemProps: (item) => ({ label: item.label || "Dato clave" }),
    },
    fields: [
      text("label", "Nombre del dato", { required: true }),
      text("value", "Descripción", { required: true, long: true }),
    ],
  },
  text("heroImageAlt", "Descripción accesible de la portada", { required: true, long: true }),
  text("heroImageCaption", "Leyenda científica de la portada", { required: true, long: true }),
  pageMediaGroup([
    mediaReference("hero", "Imagen inmersiva de la portada", ["micrograph", "photograph", "figure"]),
    mediaReference("registerOne", "Registro científico 01", ["micrograph", "figure"]),
    mediaReference("registerTwo", "Registro científico 02", ["micrograph", "figure"]),
    mediaReference("registerThree", "Registro científico 03", ["micrograph", "figure"]),
    mediaReference("teamEsteban", "Retrato de Esteban", ["photograph"]),
    mediaReference("teamSinay", "Retrato de Sinay", ["photograph"]),
  ]),
  { type: "object", name: "publicEntry", label: "Entrada para la sociedad", fields: publicEntryFields },
  {
    type: "object",
    name: "imageRegister",
    label: "Registro científico de imágenes",
    required: true,
    fields: [
      text("label", "Código del registro", { required: true }),
      text("title", "Título", { required: true }),
      text("introduction", "Introducción", { required: true, long: true }),
      text("statusLabel", "Etiqueta del estado", { required: true }),
      text("status", "Estado del registro", { required: true }),
      text("criterionLabel", "Etiqueta del criterio", { required: true }),
      text("criterion", "Criterio de publicación", { required: true, long: true }),
      {
        type: "object",
        name: "figures",
        label: "Registros",
        list: true,
        required: true,
        ui: {
          min: 3,
          max: 3,
          itemProps: (item) => ({ label: item.code || item.title || "Registro" }),
        },
        fields: [
          text("code", "Código", { required: true }),
          text("title", "Título", { required: true }),
          text("note", "Nota científica", { required: true, long: true }),
          text("alt", "Texto alternativo", { required: true, long: true }),
        ],
      },
    ],
  },
  text("researchEyebrow", "Contexto de investigación"),
  text("researchTitle", "Título de investigación"),
  text("researchIntroduction", "Introducción de investigación", { long: true }),
  text("pipelineEyebrow", "Contexto de métodos"),
  text("pipelineTitle", "Título de métodos"),
  text("pipelineIntroduction", "Introducción de métodos", { long: true }),
  text("fundingEyebrow", "Contexto de financiamiento"),
  text("fundingTitle", "Título de financiamiento"),
  text("fundingIntroduction", "Introducción de financiamiento", { long: true }),
  text("publicationsEyebrow", "Contexto de publicaciones"),
  text("publicationsTitle", "Título de publicaciones"),
  text("publicationsIntroduction", "Introducción de publicaciones", { long: true }),
  text("publicationsActionLabel", "Enlace al catálogo"),
  text("publicationLinkLabel", "Etiqueta para abrir publicación"),
  text("openAccessLabel", "Etiqueta de acceso abierto"),
  text("singleCitationLabel", "Etiqueta para una cita", { required: true }),
  text("citationsLabel", "Etiqueta de citas"),
  text("publicationAuthorsContinuation", "Abreviatura para más autores", { required: true }),
  text("teamEyebrow", "Contexto del equipo"),
  text("teamTitle", "Título del equipo"),
  text("teamIntroduction", "Introducción del equipo", { long: true }),
  {
    type: "object",
    name: "teamPortraitAlt",
    label: "Textos alternativos de retratos",
    required: true,
    fields: [
      text("principalInvestigator", "Investigador principal", { required: true }),
      text("laboratoryCoordinator", "Coordinación del laboratorio", { required: true }),
    ],
  },
  text("teamActionLabel", "Enlace al equipo", { required: true }),
  text("joinEyebrow", "Contexto del llamado final"),
  text("joinTitle", "Título del llamado final"),
  text("joinIntroduction", "Texto del llamado final", { long: true }),
  { type: "object", name: "joinAction", label: "Acción final", fields: actionFields },
];

const researchContentFields: TinaField[] = [
  ...heroFields,
  pageMediaGroup([
    mediaReference("brainstemCircuits", "Circuitos del tronco encefálico", ["micrograph", "figure"]),
    mediaReference("respiratoryNeurodynamics", "Neurodinámica respiratoria", ["micrograph", "figure"]),
    mediaReference("diseaseNeurophysiology", "Neurofisiología de la enfermedad", ["micrograph", "figure"]),
  ]),
  text("asideLabel", "Etiqueta del alcance", { required: true }),
  text("asideText", "Resumen del alcance", { required: true, long: true }),
  text("questionLabel", "Etiqueta de pregunta", { required: true }),
  text("hypothesisLabel", "Etiqueta de hipótesis", { required: true }),
  text("systemsLabel", "Etiqueta de sistemas", { required: true }),
  text("measurementsLabel", "Etiqueta de mediciones", { required: true }),
  text("contextLabel", "Etiqueta de contexto", { required: true }),
  text("relatedEvidenceLabel", "Etiqueta de antecedentes", { required: true }),
  text("fundingEyebrow", "Contexto de financiamiento"),
  text("fundingTitle", "Título de financiamiento"),
  text("fundingIntroduction", "Introducción de financiamiento", { long: true }),
];

const techniquesContentFields: TinaField[] = [
  ...heroFields,
  pageMediaGroup([
    mediaReference("evidencePrimary", "Registro experimental principal", ["micrograph", "figure"]),
    mediaReference("evidenceSecondary", "Detalle experimental", ["micrograph", "figure"]),
  ]),
  text("railLabel", "Etiqueta del proceso", { required: true }),
  text("asideText", "Criterio metodológico", { required: true, long: true }),
  text("questionLabel", "Etiqueta de pregunta", { required: true }),
  text("scopeLabel", "Etiqueta de sistema o muestra", { required: true }),
  text("outputLabel", "Etiqueta de salida experimental", { required: true }),
  text("methodsLabel", "Etiqueta de capacidades", { required: true }),
  text("evidenceEyebrow", "Contexto del registro visual", { required: true }),
  text("evidenceTitle", "Título del registro visual", { required: true }),
  text("evidenceIntroduction", "Criterio de lectura del registro", { required: true, long: true }),
  text("evidencePrimaryCaption", "Leyenda del registro principal", { required: true, long: true }),
  text("evidenceSecondaryCaption", "Leyenda del detalle", { required: true, long: true }),
  text("evidenceNote", "Nota de trazabilidad", { required: true, long: true }),
  text("closingEyebrow", "Contexto del cierre", { required: true }),
  text("closingTitle", "Título de cierre", { required: true }),
  text("closingText", "Texto de cierre", { required: true, long: true }),
  text("integrationLabel", "Etiqueta del flujo integrado", { required: true }),
  text("integrationSteps", "Pasos del flujo integrado", { required: true, list: true }),
  text("closingActionLabel", "Enlace para conversar", { required: true }),
];

const teamContentFields: TinaField[] = [
  ...heroFields,
  pageMediaGroup([
    mediaReference("estebanDiazJara", "Retrato de Esteban Díaz Jara", ["photograph"]),
    mediaReference("sinayVicencio", "Retrato de Sinay Vicencio", ["photograph"]),
  ]),
  text("asideLabel", "Etiqueta del modo de trabajo", { required: true }),
  text("asideText", "Síntesis del modo de trabajo", { required: true, long: true }),
  text("scientificResponsibilityLabel", "Etiqueta de responsabilidad científica", { required: true }),
  text("profileLinksLabel", "Descripción accesible de perfiles académicos", { required: true }),
];

const publicationsContentFields: TinaField[] = [
  ...heroFields,
  text("profilesTitle", "Título de perfiles académicos"),
  {
    type: "object",
    name: "profiles",
    label: "Perfiles académicos",
    list: true,
    fields: [
      hiddenString("id", "ID"),
      text("label", "Nombre", { required: true }),
      text("href", "Enlace"),
      {
        type: "string",
        name: "state",
        label: "Estado",
        options: [
          { label: "Publicado", value: "published" },
          { label: "En preparación", value: "forthcoming" },
        ],
      },
    ],
  },
  {
    type: "string",
    name: "status",
    label: "Estado del catálogo",
    options: [
      { label: "Publicado", value: "published" },
      { label: "En preparación", value: "forthcoming" },
    ],
  },
  text("statusTitle", "Título de procedencia"),
  text("statusText", "Descripción de procedencia", { long: true }),
  text("emptyListLabel", "Mensaje sin resultados"),
  {
    type: "object",
    name: "metrics",
    label: "Indicadores bibliométricos",
    fields: [
      text("ariaLabel", "Descripción accesible", { required: true }),
      text("papers", "Artículos y revisiones", { required: true }),
      text("works", "Obras canónicas", { required: true }),
      text("citations", "Citas", { required: true }),
      text("hIndex", "Índice h", { required: true }),
      text("openAccess", "Acceso abierto", { required: true }),
    ],
  },
  {
    type: "object",
    name: "network",
    label: "Red bibliográfica interactiva",
    fields: [
      text("eyebrow", "Contexto breve", { required: true }),
      text("title", "Título", { required: true }),
      {
        ...text("introduction", "Introducción", { required: true, long: true }),
        description: "Usa {papers} y {topics} para insertar automáticamente las cantidades actuales.",
      },
      text("papers", "Etiqueta de publicaciones", { required: true }),
      text("themes", "Etiqueta de temas", { required: true }),
      text("contentsLabel", "Descripción accesible del resumen", { required: true }),
      text("graphLabel", "Descripción accesible del grafo", { required: true }),
      text("focusLabel", "Instrucción de filtros", { required: true }),
      text("complete", "Vista completa", { required: true }),
      text("export", "Descarga bibliográfica", { required: true }),
      text("paperLegend", "Leyenda de publicaciones", { required: true }),
      text("sizeLegend", "Leyenda de tamaño", { required: true }),
      text("recentLegend", "Leyenda de recencia", { required: true }),
      text("relationLegend", "Leyenda de conexiones", { required: true }),
      text("selectedPaper", "Publicación seleccionada", { required: true }),
      text("selectedTheme", "Tema seleccionado", { required: true }),
      text("citations", "Unidad de citas", { required: true }),
      text("topicHeading", "Título de temas asignados", { required: true }),
      text("connectedHeading", "Título de publicaciones relacionadas", { required: true }),
      text("connectionOrder", "Criterio de orden de las relaciones", { required: true, long: true }),
      text("exploreConnection", "Acción accesible para enfocar una relación", { required: true }),
      text("noConnections", "Mensaje sin relaciones", { required: true }),
      text("source", "Enlace a la fuente", { required: true }),
      text("catalogue", "Enlace al catálogo", { required: true }),
      text("inferredTheme", "Descripción de tema inferido", { required: true }),
      text("themeNote", "Nota sobre clasificación temática", { required: true, long: true }),
      text("method", "Nota metodológica", { required: true, long: true }),
      text("nodePaper", "Tipo accesible: publicación", { required: true }),
      text("nodeTheme", "Tipo accesible: tema", { required: true }),
      text("legendLabel", "Descripción accesible de la leyenda", { required: true }),
    ],
  },
  {
    type: "object",
    name: "catalogue",
    label: "Textos del catálogo y sus filtros",
    fields: [
      text("eyebrow", "Contexto breve", { required: true }),
      text("title", "Título", { required: true }),
      text("introduction", "Introducción", { required: true, long: true }),
      text("filterLabel", "Descripción accesible de los filtros", { required: true }),
      text("filterArticles", "Filtro de artículos", { required: true }),
      text("filterAbstracts", "Filtro de abstracts", { required: true }),
      text("filterOther", "Filtro de otros registros", { required: true }),
      text("filterAll", "Filtro de todos los registros", { required: true }),
      text("searchLabel", "Etiqueta de búsqueda", { required: true }),
      text("searchPlaceholder", "Ejemplo de búsqueda", { required: true }),
      text("sortLabel", "Etiqueta de orden", { required: true }),
      text("sortCurated", "Orden por selección editorial", { required: true }),
      text("sortNewest", "Orden más reciente", { required: true }),
      text("sortCited", "Orden más citado", { required: true }),
      text("sortOldest", "Orden más antiguo", { required: true }),
      text("topicLabel", "Etiqueta de tópico", { required: true }),
      text("topicAll", "Todos los tópicos", { required: true }),
      text("featured", "Distintivo de selección", { required: true }),
      text("shown", "Unidad del contador visible", { required: true }),
      text("citedBy", "Unidad de citas", { required: true }),
      text("scholar", "Etiqueta de Scholar", { required: true }),
      text("openAlex", "Etiqueta de OpenAlex", { required: true }),
      text("doi", "Etiqueta de DOI", { required: true }),
      text("openAccess", "Etiqueta del texto abierto", { required: true }),
      text("sourceCrossed", "Fuente cruzada", { required: true }),
      text("sourceScholar", "Fuente exclusiva de Scholar", { required: true }),
      text("downloadBib", "Descarga bibliográfica", { required: true }),
      text("scholarOnlyNote", "Nota para registros exclusivos de Scholar", { required: true, long: true }),
      text("backToFilters", "Volver a los filtros", { required: true }),
    ],
  },
  {
    type: "object",
    name: "typeLabels",
    label: "Tipos de publicación",
    fields: [
      text("journalArticle", "Artículo", { required: true }),
      text("review", "Revisión", { required: true }),
      text("conferenceAbstract", "Abstract de congreso", { required: true }),
      text("conferenceProceedingsChapter", "Capítulo o proceedings", { required: true }),
      text("correction", "Corrección", { required: true }),
      text("doctoralThesis", "Tesis doctoral", { required: true }),
    ],
  },
  {
    type: "object",
    name: "provenance",
    label: "Procedencia y fuentes",
    fields: [
      text("eyebrow", "Contexto breve", { required: true }),
      text("updatedLabel", "Etiqueta de actualización", { required: true }),
      text("sourcesLabel", "Descripción accesible de las fuentes", { required: true }),
      {
        type: "object",
        name: "sources",
        label: "Fuentes consultadas",
        list: true,
        fields: [
          text("label", "Nombre", { required: true }),
          text("href", "Enlace", { required: true }),
        ],
        ui: { min: 1, itemProps: (item) => ({ label: item.label || "Fuente" }) },
      },
    ],
  },
];

const philosophyContentFields: TinaField[] = [
  ...heroFields,
  text("asideLabel", "Etiqueta del alcance", { required: true }),
  text("asideText", "Resumen del alcance", { required: true }),
  text("generalCriterionLabel", "Título del criterio general", { required: true }),
  text("statement", "Declaración general", { required: true, long: true }),
  text("missionLabel", "Etiqueta de misión"),
  text("mission", "Misión", { required: true, long: true }),
  text("visionLabel", "Etiqueta de visión"),
  text("vision", "Visión", { required: true, long: true }),
  text("valuesEyebrow", "Contexto de valores"),
  text("valuesTitle", "Título de valores"),
  text("valuesIntroduction", "Introducción de los valores", { required: true, long: true }),
];

const outreachContentFields: TinaField[] = [
  ...heroFields,
  {
    type: "string",
    name: "status",
    label: "Estado",
    options: [
      { label: "Publicado", value: "published" },
      { label: "En preparación", value: "forthcoming" },
    ],
  },
  text("statusTitle", "Título del estado"),
  text("statusText", "Explicación del estado", { long: true }),
  {
    type: "object",
    name: "archive",
    label: "Archivo de divulgación",
    fields: [
      text("eyebrow", "Contexto breve", { required: true }),
      text("title", "Título", { required: true }),
      text("introduction", "Introducción", { required: true, long: true }),
      text("publishedEntrySingular", "Contador singular", { required: true }),
      {
        type: "string",
        name: "publishedEntryPlural",
        label: "Contador plural",
        description: "Usa {count} donde debe aparecer el número.",
        required: true,
      },
      text("emptyAsideText", "Resumen cuando el archivo está vacío", { required: true, long: true }),
      text("comingSoonLabel", "Etiqueta de próximo contenido", { required: true }),
      text("readLabel", "Enlace para leer", { required: true }),
      text("articleLabel", "Tipo artículo", { required: true }),
      text("eventLabel", "Tipo actividad", { required: true }),
      text("resourceLabel", "Tipo recurso", { required: true }),
    ],
  },
  {
    type: "object",
    name: "entry",
    label: "Textos de las entradas",
    fields: [
      text("section", "Nombre de sección", { required: true }),
      text("back", "Volver al archivo", { required: true }),
      text("published", "Etiqueta de publicación", { required: true }),
      text("updated", "Etiqueta de actualización", { required: true }),
      text("language", "Etiqueta de idioma", { required: true }),
      text("languageValue", "Nombre del idioma", { required: true }),
      text("editorial", "Título de nota editorial", { required: true }),
      text("editorialText", "Nota editorial", { required: true, long: true }),
      text("more", "Contexto del cierre", { required: true }),
      text("research", "Enlace a investigación", { required: true }),
      text("contact", "Enlace a contacto", { required: true }),
      text("attachmentLabel", "Descarga de documento", { required: true }),
      text("pagesLabel", "Unidad de páginas", { required: true }),
    ],
  },
  { type: "object", name: "statusPrimaryAction", label: "Acción principal del estado", fields: actionFields },
  { type: "object", name: "statusSecondaryAction", label: "Acción secundaria del estado", fields: actionFields },
  text("instagramLabel", "Etiqueta de Instagram"),
  text("instagramHref", "Enlace de Instagram"),
  {
    type: "string",
    name: "instagramStatus",
    label: "Estado de Instagram",
    options: [
      { label: "Publicado", value: "published" },
      { label: "En preparación", value: "forthcoming" },
    ],
  },
];

const contactContentFields: TinaField[] = [
  ...heroFields,
  text("asideLabel", "Etiqueta de respuesta directa", { required: true }),
  text("locationTitle", "Título de ubicación"),
  text("institution", "Institución"),
  text("center", "Centro"),
  text("faculty", "Facultad"),
  text("laboratory", "Laboratorio y piso"),
  text("streetAddress", "Dirección"),
  text("mapEyebrow", "Contexto del mapa", { required: true }),
  text("mapTitle", "Título del mapa"),
  text("mapIframeTitle", "Descripción accesible del mapa", { required: true }),
  text("mapLoadLabel", "Etiqueta para cargar mapa"),
  text("mapExternalLabel", "Etiqueta para abrir mapa"),
  text("mapQuery", "Consulta cartográfica", { long: true }),
  text("directEmailLabel", "Etiqueta del correo"),
  text("email", "Correo", { required: true }),
  {
    type: "object",
    name: "form",
    label: "Formulario",
    fields: [
      text("title", "Título"),
      text("introduction", "Introducción", { long: true }),
      text("nameLabel", "Etiqueta de nombre"),
      text("namePlaceholder", "Ejemplo de nombre"),
      text("emailLabel", "Etiqueta de correo"),
      text("emailPlaceholder", "Ejemplo de correo"),
      text("messageLabel", "Etiqueta de mensaje"),
      text("messagePlaceholder", "Ejemplo de mensaje", { long: true }),
      text("submitLabel", "Botón enviar"),
      text("submittingLabel", "Enviando"),
      text("successTitle", "Título de éxito"),
      text("successMessage", "Mensaje de éxito", { long: true }),
      text("errorTitle", "Título de error"),
      text("errorMessage", "Mensaje de error", { long: true }),
      text("requiredMessage", "Campo obligatorio"),
      text("invalidEmailMessage", "Correo inválido"),
      text("unavailableMessage", "Formulario no disponible", { long: true }),
      text("fallbackHint", "Aviso al abrir la aplicación de correo", { required: true }),
      text("fallbackSubject", "Asunto del correo alternativo", { required: true }),
      text("fallbackNameLabel", "Etiqueta de nombre en el correo", { required: true }),
      text("fallbackEmailLabel", "Etiqueta de correo en el mensaje", { required: true }),
      text("honeypotLabel", "Campo antispam"),
    ],
  },
  {
    type: "object",
    name: "join",
    label: "Oportunidades",
    fields: [
      text("eyebrow", "Contexto breve"),
      text("title", "Título"),
      text("paragraphs", "Párrafos", { list: true, long: true }),
      text("actionLabel", "Etiqueta del enlace"),
      text("emailSubject", "Asunto del correo"),
    ],
  },
];

const bilingualPageContent = (fields: TinaField[]): TinaField => ({
  type: "object",
  name: "content",
  label: "Contenido",
  description: "Empieza en español y revisa la versión en inglés antes de publicar.",
  fields: [
    { type: "object", name: "es", label: "Español", fields },
    { type: "object", name: "en", label: "Inglés", fields },
  ],
});

const pageFields = (
  contentFields: TinaField[],
  allowedBlocks: readonly string[],
): TinaField[] => [
  hiddenString("pageKey", "Clave de página"),
  hiddenNumber("schemaVersion", "Versión"),
  hiddenString("state", "Estado editorial protegido"),
  { type: "boolean", name: "routesLocked", label: "Rutas protegidas", ui: { component: null } },
  {
    type: "object",
    name: "route",
    label: "Rutas protegidas",
    ui: { component: null },
    fields: [
      hiddenString("es", "Ruta ES"),
      hiddenString("en", "Ruta EN"),
    ],
  },
  bilingualPageContent(contentFields),
  blocksField(allowedBlocks),
  seoField,
];

const pageTemplates: Template[] = [
  { name: "home", label: "Inicio", fields: pageFields(homeContentFields, PAGE_BLOCK_TYPES.home) },
  { name: "research", label: "Investigación", fields: pageFields(researchContentFields, PAGE_BLOCK_TYPES.research) },
  { name: "techniques", label: "Técnicas", fields: pageFields(techniquesContentFields, PAGE_BLOCK_TYPES.techniques) },
  { name: "team", label: "Equipo", fields: pageFields(teamContentFields, PAGE_BLOCK_TYPES.team) },
  { name: "publications", label: "Publicaciones", fields: pageFields(publicationsContentFields, PAGE_BLOCK_TYPES.publications) },
  { name: "philosophy", label: "Cómo trabajamos", fields: pageFields(philosophyContentFields, PAGE_BLOCK_TYPES.philosophy) },
  { name: "outreach", label: "Divulgación", fields: pageFields(outreachContentFields, PAGE_BLOCK_TYPES.outreach) },
  { name: "contact", label: "Contacto", fields: pageFields(contactContentFields, PAGE_BLOCK_TYPES.contact) },
];

const entityTranslations = (
  fields: TinaField[],
): TinaField => ({
  type: "object",
  name: "translations",
  label: "Contenido bilingüe",
  fields: [
    { type: "object", name: "es", label: "Español", fields },
    { type: "object", name: "en", label: "Inglés", fields },
  ],
});

const researchAreaTranslationFields: TinaField[] = [
  text("number", "Número", { required: true }),
  text("title", "Título", { required: true }),
  text("summary", "Resumen", { required: true, long: true }),
  text("body", "Contexto y alcance", { required: true, long: true }),
  text("imageAlt", "Texto alternativo", { required: true, long: true }),
  text("figureCaption", "Leyenda científica", { required: true, long: true }),
  text("question", "Pregunta", { required: true, long: true }),
  text("hypothesis", "Hipótesis de trabajo", { required: true, long: true }),
  text("systems", "Sistemas", { required: true, list: true }),
  text("measurements", "Mediciones", { required: true, list: true }),
  text("status", "Estado de la línea", { required: true }),
];

const techniqueTranslationFields: TinaField[] = [
  text("number", "Número", { required: true }),
  text("verb", "Verbo", { required: true }),
  text("title", "Título", { required: true }),
  text("question", "Pregunta científica", { required: true, long: true }),
  text("description", "Descripción", { required: true, long: true }),
  {
    type: "object",
    name: "items",
    label: "Capacidades",
    description: "Distingue el nombre visible del tipo de recurso o método.",
    list: true,
    required: true,
    ui: {
      min: 1,
      max: 8,
      itemProps: (item) => ({ label: item.label || "Capacidad metodológica" }),
    },
    fields: [
      text("label", "Nombre", { required: true }),
      text("kind", "Tipo", { required: true }),
    ],
  },
  text("scope", "Alcance", { required: true, long: true }),
  text("output", "Resultado", { required: true, long: true }),
];

const grantTranslationFields: TinaField[] = [
  text("agency", "Agencia", { required: true }),
  text("number", "Número", { required: true }),
  text("title", "Título editorial", { required: true, long: true }),
  text("officialTitle", "Título oficial", { required: true, long: true }),
  {
    type: "string",
    name: "officialLang",
    label: "Idioma del título oficial",
    required: true,
    options: [
      { label: "Español", value: "es" },
      { label: "Inglés", value: "en" },
    ],
  },
  text("principalInvestigatorLabel", "Etiqueta de investigador principal", { required: true }),
  text("principalInvestigator", "Investigador principal", { required: true }),
  text("endDateLabel", "Etiqueta de término", { required: true }),
  text("endDate", "Fecha visible", { required: true }),
];

const personTranslationFields: TinaField[] = [
  text("name", "Nombre", { required: true }),
  text("role", "Rol", { required: true }),
  text("credentials", "Formación", { required: true, long: true }),
  text("institution", "Institución"),
  text("bio", "Biografía", { required: true, list: true, long: true }),
  text("research", "Responsabilidad científica", { long: true }),
  text("portraitAlt", "Texto alternativo del retrato", { long: true }),
  text("statusLabel", "Estado visible"),
];

const valueTranslationFields: TinaField[] = [
  text("number", "Número", { required: true }),
  text("title", "Título", { required: true }),
  text("description", "Conducta observable", { required: true, long: true }),
];

const settingsFields: TinaField[] = [
  hiddenString("id", "ID"),
  hiddenNumber("schemaVersion", "Versión"),
  { type: "string", name: "defaultLocale", label: "Idioma principal", ui: { component: null } },
  {
    type: "object",
    name: "languages",
    label: "Idiomas",
    ui: { component: null },
    fields: [
      { type: "object", name: "es", label: "Español", fields: [hiddenString("htmlLang", "HTML"), hiddenString("languageName", "Nombre"), hiddenString("alternateLanguageLabel", "Alternativo")] },
      { type: "object", name: "en", label: "Inglés", fields: [hiddenString("htmlLang", "HTML"), hiddenString("languageName", "Nombre"), hiddenString("alternateLanguageLabel", "Alternativo")] },
    ],
  },
  {
    type: "object",
    name: "routes",
    label: "Rutas protegidas",
    ui: { component: null },
    fields: Object.keys(PAGE_ROUTES).map((pageKey) => ({
      type: "object",
      name: pageKey,
      label: pageKey,
      fields: [hiddenString("es", "ES"), hiddenString("en", "EN"), { type: "boolean", name: "locked", label: "Protegida", ui: { component: null } }],
    })),
  },
  {
    type: "object",
    name: "brand",
    label: "Identidad del laboratorio",
    fields: [
      localizedText("name", "Nombre corto", { required: true }),
      localizedText("scientificName", "Nombre científico", { required: true }),
      localizedText("shortDescription", "Descripción breve", { required: true, long: true }),
      localizedText("logoAlt", "Texto alternativo del logo", { required: true }),
      { type: "image", name: "primaryLogo", label: "Logo principal" },
      { type: "image", name: "horizontalLogo", label: "Logo horizontal" },
    ],
  },
  {
    type: "object",
    name: "navigation",
    label: "Navegación",
    fields: [
      localizedText("ariaLabel", "Nombre accesible"),
      localizedText("openMenuLabel", "Abrir menú"),
      localizedText("closeMenuLabel", "Cerrar menú"),
      localizedText("laboratoryMenuLabel", "Menú Laboratorio"),
      localizedText("languageSwitcherLabel", "Cambiar idioma"),
      {
        type: "object",
        name: "items",
        label: "Enlaces",
        list: true,
        fields: [
          hiddenString("id", "ID"),
          {
            type: "string",
            name: "page",
            label: "Página",
            options: Object.keys(PAGE_ROUTES).map((page) => ({ label: page, value: page })),
          },
          {
            type: "string",
            name: "menu",
            label: "Grupo",
            options: [
              { label: "Principal", value: "primary" },
              { label: "Laboratorio", value: "laboratory" },
            ],
          },
          localizedText("label", "Texto visible", { required: true }),
        ],
      },
    ],
  },
  {
    type: "object",
    name: "common",
    label: "Textos comunes",
    fields: [
      localizedText("skipToContent", "Saltar al contenido"),
      localizedText("readMore", "Leer más"),
      localizedText("learnMore", "Más información"),
      localizedText("backToHome", "Volver al inicio"),
      {
        type: "object",
        name: "stateLabels",
        label: "Estados",
        fields: [
          localizedText("published", "Publicado"),
          localizedText("forthcoming", "En preparación"),
        ],
      },
    ],
  },
  {
    type: "object",
    name: "footer",
    label: "Pie de página",
    fields: [
      localizedText("description", "Descripción", { long: true }),
      localizedText("navigationLabel", "Etiqueta de navegación"),
      localizedText("contactLabel", "Etiqueta de contacto"),
      localizedText("location", "Ubicación breve"),
      localizedText("affiliation", "Afiliación", { long: true }),
      localizedText("copyright", "Derechos"),
    ],
  },
];

export default defineConfig({
  branch: null,
  clientId: null,
  token: null,
  telemetry: "disabled",
  cmsCallback: configureStudioCms,
  build: {
    outputFolder: "admin",
    publicFolder: "public",
    host: "127.0.0.1",
  },
  server: {
    allowedOrigins: [
      "http://localhost:4321",
      "http://127.0.0.1:4321",
    ],
  },
  media: {
    tina: {
      mediaRoot: "uploads",
      publicFolder: "public",
    },
    accept: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ],
  },
  ui: {
    optOutOfUpdateCheck: true,
    regexValidation: {
      folderNameRegex: "^[a-z0-9-]+$",
    },
  },
  repoProvider: {
    defaultBranchName: "main",
  },
  schema: {
    collections: [
      {
        name: "settings",
        label: "Ajustes del sitio",
        path: "content/settings",
        format: "json",
        fields: settingsFields,
        ui: {
          global: { layout: "popup" },
          filename: { readonly: true },
          allowedActions: { create: false, delete: false, createFolder: false },
          beforeSubmit: async ({ values }) => ({
            ...values,
            id: "site",
            schemaVersion: 1,
            defaultLocale: "es",
            routes: Object.fromEntries(
              Object.entries(PAGE_ROUTES).map(([pageKey, route]) => [
                pageKey,
                { ...route, locked: true },
              ]),
            ),
          }),
        },
      },
      {
        name: "pages",
        label: "Páginas",
        path: "content/pages",
        format: "json",
        templates: pageTemplates,
        ui: {
          filename: { readonly: true },
          allowedActions: { create: false, delete: false, createFolder: false },
          router: ({ document }) =>
            PAGE_ROUTES[document._sys.filename as keyof typeof PAGE_ROUTES]?.es,
          beforeSubmit: async ({ values }) => {
            const pageKey = values.pageKey as keyof typeof PAGE_ROUTES;
            const allowedBlocks = PAGE_BLOCK_TYPES[pageKey];
            const sourceBlocks = Array.isArray(values.blocks)
              ? values.blocks as Record<string, unknown>[]
              : [];
            const receivedTypes = sourceBlocks.map((block) => String(block.type || ""));
            const uniqueTypes = new Set(receivedTypes);
            if (
              sourceBlocks.length !== allowedBlocks.length
              || uniqueTypes.size !== allowedBlocks.length
              || allowedBlocks.some((type) => !uniqueTypes.has(type))
            ) {
              throw new Error("La estructura de bloques cambió de forma no permitida. Recarga la página y vuelve a ordenar u ocultar los bloques existentes.");
            }
            const blocks = sourceBlocks.map((block, index) => {
              const type = String(block.type);
              const locked = LOCKED_BLOCK_TYPES.has(type);
              return {
                ...block,
                id: typeof block.id === "string" && block.id.trim()
                  ? block.id
                  : `${pageKey}-${type.replace(/([a-z])([A-Z])/gu, "$1-$2").toLocaleLowerCase("en")}`,
                type,
                order: index + 1,
                enabled: locked ? true : block.enabled !== false,
                locked,
                variant: BLOCK_VARIANT_BY_TYPE.get(type) ?? "editorial",
              };
            });
            return {
              ...values,
              pageKey,
              schemaVersion: 1,
              state: "published",
              routesLocked: true,
              route: PAGE_ROUTES[pageKey],
              blocks,
            };
          },
        },
      },
      {
        name: "researchAreas",
        label: "Líneas de investigación",
        path: "content/entities/research-areas",
        format: "json",
        fields: [
          hiddenString("id", "ID estable"),
          entityOrderField,
          mediaReference("imageMedia", "Imagen desde Registro de medios", ["micrograph", "figure"]),
          hiddenString("image", "Imagen directa legada"),
          { type: "string", name: "relatedDois", label: "DOI relacionados", list: true },
          entityTranslations(researchAreaTranslationFields),
        ],
        ui: {
          filename: entityFilename,
          allowedActions: { create: true, delete: true, createFolder: false },
        },
      },
      {
        name: "techniqueStages",
        label: "Métodos",
        path: "content/entities/technique-stages",
        format: "json",
        fields: [
          hiddenString("id", "ID estable"),
          entityOrderField,
          {
            type: "string",
            name: "accent",
            label: "Acento visual",
            required: true,
            options: [
              { label: "Ámbar", value: "amber" },
              { label: "Verde azulado", value: "teal" },
              { label: "Cian", value: "cyan" },
              { label: "Azul profundo", value: "navy" },
            ],
          },
          entityTranslations(techniqueTranslationFields),
        ],
        ui: {
          filename: entityFilename,
          allowedActions: { create: false, delete: false, createFolder: false },
        },
      },
      {
        name: "grants",
        label: "Financiamiento",
        path: "content/entities/grants",
        format: "json",
        fields: [
          hiddenString("id", "ID estable"),
          entityOrderField,
          {
            type: "string",
            name: "state",
            label: "Estado",
            required: true,
            options: [
              { label: "Publicado", value: "published" },
              { label: "En preparación", value: "forthcoming" },
            ],
          },
          { type: "datetime", name: "endDateIso", label: "Fecha de término", required: true },
          entityTranslations(grantTranslationFields),
        ],
        ui: {
          filename: entityFilename,
          allowedActions: { create: true, delete: true, createFolder: false },
        },
      },
      {
        name: "people",
        label: "Personas",
        path: "content/entities/people",
        format: "json",
        fields: [
          hiddenString("id", "ID estable"),
          entityOrderField,
          {
            type: "reference",
            name: "group",
            label: "Grupo",
            required: true,
            collections: ["teamGroups"],
            description: "Selecciona uno de los grupos editables del equipo.",
          },
          mediaReference("portraitMedia", "Retrato desde Registro de medios", ["photograph"]),
          hiddenString("portrait", "Retrato directo legado"),
          {
            type: "string",
            name: "state",
            label: "Estado",
            required: true,
            options: [
              { label: "Publicado", value: "published" },
              { label: "En preparación", value: "forthcoming" },
            ],
          },
          entityTranslations(personTranslationFields),
        ],
        ui: {
          filename: entityFilename,
          allowedActions: { create: true, delete: true, createFolder: false },
        },
      },
      {
        name: "teamGroups",
        label: "Grupos del equipo",
        path: "content/entities/team-groups",
        format: "json",
        fields: [
          hiddenString("id", "ID estable"),
          entityOrderField,
          entityTranslations([text("label", "Nombre", { required: true })]),
        ],
        ui: {
          filename: entityFilename,
          allowedActions: { create: true, delete: false, createFolder: false },
        },
      },
      {
        name: "values",
        label: "Prácticas del laboratorio",
        path: "content/entities/values",
        format: "json",
        fields: [
          hiddenString("id", "ID estable"),
          entityOrderField,
          entityTranslations(valueTranslationFields),
        ],
        ui: {
          filename: entityFilename,
          allowedActions: { create: true, delete: true, createFolder: false },
        },
      },
      {
        name: "publicationCuration",
        label: "Publicaciones",
        path: "content/publications",
        format: "json",
        fields: [
          hiddenString("id", "ID"),
          hiddenNumber("schemaVersion", "Versión"),
          { type: "number", name: "maximumFeatured", label: "Máximo destacado", ui: { component: null } },
          { type: "string", name: "protectedFields", label: "Metadatos protegidos", list: true, ui: { component: null } },
          {
            type: "object",
            name: "topics",
            label: "Cuatro tópicos del grafo",
            list: true,
            ui: {
              min: 4,
              max: 4,
              itemProps: (item) => ({ label: item.label?.es || item.id || "Tópico" }),
            },
            fields: [
              hiddenString("id", "ID protegido"),
              localizedText("label", "Nombre", { required: true }),
              {
                type: "string",
                name: "color",
                label: "Color",
                required: true,
                ui: {
                  component: "color",
                  colorFormat: "hex",
                  widget: "block",
                  colors: TOPIC_COLORS,
                },
              },
              { type: "boolean", name: "locked", label: "Protegido", ui: { component: null } },
            ],
          },
          {
            type: "object",
            name: "overrides",
            label: "Selección editorial",
            list: true,
            ui: {
              itemProps: (item) => ({
                label: (item.featured ? "Destacado · " : "")
                  + (PUBLICATION_BY_ID.get(item.publicationId)?.title || item.publicationId || "Publicación"),
              }),
            },
            fields: [
              {
                type: "string",
                name: "publicationId",
                label: "Publicación",
                required: true,
                options: PUBLICATION_OPTIONS,
                description: "Busca por título, año o DOI. Arrastra los registros destacados para cambiar su orden.",
              },
              hiddenString("doi", "DOI protegido"),
              { type: "boolean", name: "featured", label: "Destacar" },
              hiddenNumber("featuredOrder", "Orden destacado"),
              { type: "boolean", name: "hidden", label: "Ocultar del sitio" },
              {
                type: "string",
                name: "topicIds",
                label: "Tópicos",
                list: true,
                options: TOPIC_IDS.map((id) => ({ label: TOPIC_LABELS[id], value: id })),
              },
              localizedText("note", "Nota editorial", { long: true }),
            ],
          },
        ],
        ui: {
          global: { layout: "fullscreen" },
          filename: { readonly: true },
          allowedActions: { create: false, delete: false, createFolder: false },
          beforeSubmit: async ({ values }) => {
            const overrides = Array.isArray(values.overrides) ? values.overrides : [];
            const ids = new Set<string>();
            let featuredOrder = 0;
            const normalizedOverrides = overrides.map((item: Record<string, any>) => {
              const record = PUBLICATION_BY_ID.get(String(item.publicationId || ""));
              if (!record) throw new Error("Selecciona una publicación válida del catálogo.");
              if (ids.has(record.publicationId)) throw new Error(`La publicación «${record.title}» está repetida.`);
              ids.add(record.publicationId);
              const featured = item.featured === true && item.hidden !== true;
              if (featured) featuredOrder += 1;
              return {
                ...item,
                publicationId: record.publicationId,
                doi: record.doi,
                featured,
                featuredOrder: featured ? featuredOrder : null,
                topicIds: [...new Set(Array.isArray(item.topicIds) ? item.topicIds.filter((id) => TOPIC_IDS.includes(id)) : [])],
              };
            });
            const featuredCount = featuredOrder;
            if (featuredCount > 5) {
              throw new Error("Solo se pueden destacar cinco publicaciones.");
            }
            const topics = TOPIC_IDS.map((id, index) => {
              const edited = Array.isArray(values.topics)
                ? values.topics.find((topic: { id?: string }) => topic.id === id)
                : undefined;
              return {
                ...edited,
                id,
                color: edited?.color || TOPIC_COLORS[index],
                locked: true,
              };
            });
            return {
              ...values,
              id: "publication-curation",
              schemaVersion: 1,
              maximumFeatured: 5,
              topics,
              overrides: normalizedOverrides,
            };
          },
        },
      },
      {
        name: "media",
        label: "Medios",
        path: "content/media",
        format: "json",
        fields: [
          {
            type: "string",
            name: "custom_id",
            nameOverride: "id",
            label: "ID estable",
            required: true,
            isTitle: true,
            ui: { component: null },
          },
          hiddenNumber("schemaVersion", "Versión"),
          {
            type: "string",
            name: "kind",
            label: "Tipo",
            options: [
              { label: "Micrografía", value: "micrograph" },
              { label: "Fotografía", value: "photograph" },
              { label: "Figura", value: "figure" },
              { label: "Logo", value: "logo" },
              { label: "Documento", value: "document" },
            ],
            ui: { component: null },
          },
          {
            type: "string",
            name: "status",
            label: "Estado",
            options: [
              { label: "Faltan metadatos", value: "metadata-pending" },
              { label: "En revisión", value: "review" },
              { label: "Listo", value: "ready" },
              { label: "Archivado", value: "archived" },
            ],
          },
          {
            type: "object",
            name: "focalPoint",
            label: "Punto focal",
            fields: [
              { type: "number", name: "x", label: "X (0–100)" },
              { type: "number", name: "y", label: "Y (0–100)" },
            ],
          },
          {
            type: "object",
            name: "source",
            label: "Original protegido",
            ui: { component: null },
            fields: [
              hiddenString("format", "Formato"),
              hiddenString("mimeType", "MIME"),
              { type: "number", name: "byteLength", label: "Bytes", ui: { component: null } },
              hiddenString("sha256", "SHA-256"),
              { type: "boolean", name: "originalStoredLocally", label: "Original archivado", ui: { component: null } },
              hiddenString("storageKey", "Clave local"),
              { type: "number", name: "selectedPage", label: "Página", ui: { component: null } },
              { type: "number", name: "totalPages", label: "Páginas", ui: { component: null } },
            ],
          },
          {
            type: "object",
            name: "master",
            label: "Máster web protegido",
            ui: { component: null },
            fields: [
              hiddenString("path", "Ruta"),
              hiddenString("format", "Formato"),
              hiddenString("mimeType", "MIME"),
              { type: "number", name: "byteLength", label: "Bytes", ui: { component: null } },
              { type: "number", name: "width", label: "Ancho", ui: { component: null } },
              { type: "number", name: "height", label: "Alto", ui: { component: null } },
              { type: "number", name: "pages", label: "Páginas", ui: { component: null } },
              { type: "boolean", name: "hasAlpha", label: "Transparencia", ui: { component: null } },
              { type: "number", name: "pageCount", label: "Páginas PDF", ui: { component: null } },
              { type: "number", name: "widthPoints", label: "Ancho PDF", ui: { component: null } },
              { type: "number", name: "heightPoints", label: "Alto PDF", ui: { component: null } },
            ],
          },
          {
            type: "object",
            name: "editorial",
            label: "Metadatos editoriales y científicos",
            fields: [
              localizedText("alt", "Texto alternativo", { required: true, long: true }),
              localizedText("caption", "Leyenda", { required: true, long: true }),
              localizedText("credit", "Crédito", { required: true }),
              localizedText("technique", "Técnica", { required: true }),
              localizedText("provenance", "Procedencia científica", { required: true, long: true }),
            ],
          },
          {
            type: "object",
            name: "preservation",
            label: "Preservación",
            ui: { component: null },
            fields: [
              hiddenString("policy", "Política"),
              { type: "boolean", name: "sourceIccProfilePreserved", label: "ICC", ui: { component: null } },
              { type: "string", name: "operations", label: "Operaciones", list: true, ui: { component: null } },
            ],
          },
          { type: "datetime", name: "importedAt", label: "Fecha de importación", ui: { component: null } },
          {
            type: "object",
            name: "warnings",
            label: "Advertencias",
            list: true,
            ui: { component: null },
            fields: [
              hiddenString("code", "Código"),
              hiddenString("message", "Mensaje"),
            ],
          },
        ],
        ui: {
          filename: { readonly: true },
          allowedActions: { create: false, delete: false, createFolder: false },
        },
      },
      {
        name: "outreachEntries",
        label: "Divulgación",
        path: "content/outreach",
        format: "mdx",
        fields: [
          hiddenString("id", "ID"),
          text("translationKey", "Clave bilingüe", { required: true }),
          {
            type: "string",
            name: "locale",
            label: "Idioma",
            options: [
              { label: "Español", value: "es" },
              { label: "Inglés", value: "en" },
            ],
          },
          {
            type: "string",
            name: "type",
            label: "Tipo",
            options: [
              { label: "Artículo", value: "article" },
              { label: "Evento", value: "event" },
              { label: "Recurso", value: "resource" },
            ],
          },
          {
            type: "string",
            name: "state",
            label: "Estado",
            options: [
              { label: "Borrador", value: "draft" },
              { label: "En revisión", value: "review" },
              { label: "Publicado", value: "published" },
            ],
          },
          {
            ...text("slug", "Dirección de la entrada", { required: true }),
            description: "Usa palabras breves separadas por guiones, por ejemplo: respiracion-y-sueno.",
          },
          { type: "string", name: "title", label: "Título", required: true, isTitle: true },
          text("summary", "Resumen", { required: true, long: true }),
          { type: "datetime", name: "publishedAt", label: "Fecha de publicación" },
          { type: "datetime", name: "updatedAt", label: "Última revisión", required: true },
          { type: "boolean", name: "featured", label: "Destacar" },
          hiddenString("cover", "Portada directa legada"),
          mediaReference("coverMedia", "Portada desde Registro de medios", ["micrograph", "photograph", "figure"]),
          mediaReference("attachmentMedia", "Documento descargable", ["document"]),
          text("coverAlt", "Texto alternativo de portada", { long: true }),
          {
            type: "rich-text",
            name: "body",
            label: "Contenido",
            isBody: true,
            parser: { type: "markdown", skipEscaping: "html" },
            overrides: {
              toolbar: ["heading", "link", "quote", "ul", "ol", "bold", "italic"],
              headingLevels: ["h2", "h3"],
            },
          },
        ],
        ui: {
          filename: {
            parse: (value) =>
              value.toLocaleLowerCase("en").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""),
          },
          allowedActions: { create: true, delete: true, createFolder: false },
        },
      },
    ],
  },
});
