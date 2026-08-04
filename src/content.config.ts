import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const localeSchema = z.enum(["es", "en"]);
const pageKeySchema = z.enum([
  "home",
  "research",
  "techniques",
  "team",
  "publications",
  "philosophy",
  "outreach",
  "contact",
]);
const localizedStringSchema = z.object({
  es: z.string(),
  en: z.string(),
});
const localizedObjectSchema = z.object({
  es: z.object({}).passthrough(),
  en: z.object({}).passthrough(),
});
const seoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});
const sectionBlockSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  type: z.enum([
    "hero",
    "publicEntry",
    "researchPreview",
    "imageRegister",
    "techniquesPreview",
    "fundingPreview",
    "publicationsPreview",
    "teamPreview",
    "callToAction",
    "researchAreas",
    "funding",
    "techniqueStages",
    "closing",
    "teamDirectory",
    "publicationNetwork",
    "publicationCatalog",
    "provenance",
    "statement",
    "values",
    "outreachFeed",
    "status",
    "contactDetails",
    "contactForm",
    "map",
  ]),
  enabled: z.boolean(),
  locked: z.boolean(),
  order: z.number().int().positive(),
  variant: z.string().min(1),
});

const site = defineCollection({
  loader: glob({ base: "./content/site", pattern: "*.json" }),
  schema: z
    .object({
      locale: localeSchema,
      htmlLang: z.string().min(2),
      languageName: z.string().min(1),
      alternateLanguageLabel: z.string().min(1),
      routes: z.object({}).passthrough(),
      seo: z.object({}).passthrough(),
      brand: z.object({}).passthrough(),
      navigation: z.object({}).passthrough(),
      common: z.object({}).passthrough(),
      home: z.object({}).passthrough(),
      research: z.object({}).passthrough(),
      techniques: z.object({}).passthrough(),
      team: z.object({}).passthrough(),
      publications: z.object({}).passthrough(),
      philosophy: z.object({}).passthrough(),
      outreach: z.object({}).passthrough(),
      contact: z.object({}).passthrough(),
      footer: z.object({}).passthrough(),
    })
    .strict(),
});

const settings = defineCollection({
  loader: glob({ base: "./content/settings", pattern: "*.json" }),
  schema: z.object({
    id: z.literal("site"),
    schemaVersion: z.literal(1),
    defaultLocale: localeSchema,
    languages: z.object({
      es: z.object({
        htmlLang: z.string(),
        languageName: z.string(),
        alternateLanguageLabel: z.string(),
      }),
      en: z.object({
        htmlLang: z.string(),
        languageName: z.string(),
        alternateLanguageLabel: z.string(),
      }),
    }),
    routes: z.record(
      pageKeySchema,
      z.object({
        es: z.string(),
        en: z.string(),
        locked: z.literal(true),
      }),
    ),
    brand: z.object({
      name: localizedStringSchema,
      scientificName: localizedStringSchema,
      shortDescription: localizedStringSchema,
      logoAlt: localizedStringSchema,
      primaryLogo: z.string(),
      horizontalLogo: z.string(),
    }),
    navigation: z.object({
      ariaLabel: localizedStringSchema,
      openMenuLabel: localizedStringSchema,
      closeMenuLabel: localizedStringSchema,
      laboratoryMenuLabel: localizedStringSchema,
      languageSwitcherLabel: localizedStringSchema,
      items: z.array(
        z.object({
          id: z.string(),
          page: pageKeySchema,
          menu: z.enum(["primary", "laboratory"]),
          label: localizedStringSchema,
        }),
      ),
    }),
    common: z.object({}).passthrough(),
    footer: z.object({}).passthrough(),
  }),
});

const pages = defineCollection({
  loader: glob({ base: "./content/pages", pattern: "*.json" }),
  schema: z.object({
    _template: pageKeySchema,
    pageKey: pageKeySchema,
    schemaVersion: z.literal(1),
    state: z.enum(["draft", "published", "forthcoming"]),
    routesLocked: z.literal(true),
    route: localizedStringSchema,
    seo: z.object({
      es: seoSchema,
      en: seoSchema,
    }),
    blocks: z.array(sectionBlockSchema).min(1),
    content: localizedObjectSchema,
  }),
});

const bilingualEntitySchema = z
  .object({
    // Tina derives the public ID from the filename for newly-created records.
    // Existing records keep their explicit ID for backwards compatibility.
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).nullish(),
    order: z.number().int().positive().nullish(),
    translations: localizedObjectSchema,
  })
  .passthrough();

const techniqueCapabilitySchema = z.object({
  label: z.string().min(1),
  kind: z.string().min(1),
});

const techniqueTranslationSchema = z.object({
  number: z.string().regex(/^\d{2}$/u),
  verb: z.string().min(1),
  title: z.string().min(1),
  question: z.string().min(1),
  description: z.string().min(1),
  items: z.array(techniqueCapabilitySchema).min(1).max(8),
  scope: z.string().min(1),
  output: z.string().min(1),
});

const researchAreas = defineCollection({
  loader: glob({ base: "./content/entities/research-areas", pattern: "*.json" }),
  schema: bilingualEntitySchema.extend({
    imageMedia: z.string().regex(/^content\/media\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u).nullable().optional(),
    image: z.string().nullable().optional(),
    relatedDois: z.array(z.string().regex(/^10\./u)).min(1),
  }),
});

const techniqueStages = defineCollection({
  loader: glob({ base: "./content/entities/technique-stages", pattern: "*.json" }),
  schema: bilingualEntitySchema.extend({
    accent: z.enum(["amber", "teal", "cyan", "navy"]),
    translations: z.object({
      es: techniqueTranslationSchema,
      en: techniqueTranslationSchema,
    }).superRefine((translations, context) => {
      if (translations.es.items.length !== translations.en.items.length) {
        context.addIssue({
          code: "custom",
          path: ["en", "items"],
          message: "Las capacidades deben mantener paridad entre español e inglés.",
        });
      }
    }),
  }),
});

const grants = defineCollection({
  loader: glob({ base: "./content/entities/grants", pattern: "*.json" }),
  schema: bilingualEntitySchema.extend({
    state: z.enum(["published", "forthcoming"]),
    endDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  }),
});

const people = defineCollection({
  loader: glob({ base: "./content/entities/people", pattern: "*.json" }),
  schema: bilingualEntitySchema.extend({
    group: z.string().refine(
      (value) => /^(?:content\/entities\/team-groups\/)?[a-z0-9]+(?:-[a-z0-9]+)*(?:\.json)?$/u.test(value),
      "El grupo debe apuntar a un registro de grupos del equipo.",
    ),
    portraitMedia: z.string().regex(/^content\/media\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u).nullable().optional(),
    portrait: z.string().nullable(),
    state: z.enum(["published", "forthcoming"]),
  }),
});

const teamGroups = defineCollection({
  loader: glob({ base: "./content/entities/team-groups", pattern: "*.json" }),
  schema: bilingualEntitySchema,
});

const values = defineCollection({
  loader: glob({ base: "./content/entities/values", pattern: "*.json" }),
  schema: bilingualEntitySchema,
});

const media = defineCollection({
  loader: glob({ base: "./content/media", pattern: "*.json" }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    schemaVersion: z.literal(1),
    kind: z.enum(["micrograph", "photograph", "figure", "logo", "document"]),
    status: z.enum(["metadata-pending", "review", "ready", "archived"]),
    focalPoint: z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    }),
    source: z.object({
      format: z.enum(["jpeg", "png", "webp", "avif", "gif", "tiff", "pdf"]),
      mimeType: z.string().min(1),
      byteLength: z.number().int().positive(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
      originalStoredLocally: z.boolean(),
      storageKey: z.string().nullable(),
      selectedPage: z.number().int().positive().optional(),
      totalPages: z.number().int().positive().optional(),
    }),
    master: z.object({
      path: z.string().min(1),
      format: z.enum(["jpeg", "png", "webp", "avif", "gif", "tiff", "pdf"]),
      mimeType: z.string().min(1),
      byteLength: z.number().int().positive(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      pages: z.number().int().positive().optional(),
      hasAlpha: z.boolean().optional(),
      pageCount: z.number().int().positive().optional(),
      widthPoints: z.number().positive().optional(),
      heightPoints: z.number().positive().optional(),
    }),
    editorial: z.object({
      alt: localizedStringSchema,
      caption: localizedStringSchema,
      credit: localizedStringSchema,
      technique: localizedStringSchema,
      provenance: localizedStringSchema,
    }),
    preservation: z.object({
      policy: z.enum([
        "byte-for-byte-copy",
        "dimensions-preserved-web-encoding",
        "lossless-pixels-no-geometric-or-colour-operations",
        "legacy-unverified",
      ]),
      sourceIccProfilePreserved: z.boolean(),
      operations: z.array(z.string()),
    }),
    importedAt: z.string().datetime(),
    warnings: z.array(
      z.object({
        code: z.enum(["PUBLIC_FILE_LARGE", "ORIGINAL_NOT_ARCHIVED"]),
        message: z.string().min(1),
      }),
    ),
  }).superRefine((asset, context) => {
    const mimeByFormat = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      avif: "image/avif",
      gif: "image/gif",
      tiff: "image/tiff",
      pdf: "application/pdf",
    } as const;
    const addIssue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: "custom", path, message });

    if (asset.source.mimeType !== mimeByFormat[asset.source.format]) {
      addIssue(["source", "mimeType"], "El MIME del original no coincide con su formato verificado.");
    }
    if (asset.master.mimeType !== mimeByFormat[asset.master.format]) {
      addIssue(["master", "mimeType"], "El MIME del máster no coincide con su formato.");
    }

    if (asset.kind === "document") {
      if (asset.source.format !== "pdf" || asset.master.format !== "pdf") {
        addIssue(["master", "format"], "Un documento debe conservarse como PDF validado.");
      }
      if (!/^public\/media\/documents\/[a-z0-9]+(?:-[a-z0-9]+)*--[a-f0-9]{12}\.pdf$/u.test(asset.master.path)) {
        addIssue(["master", "path"], "Los PDF deben publicarse bajo public/media/documents.");
      }
      if (!asset.master.pageCount || !asset.master.widthPoints || !asset.master.heightPoints) {
        addIssue(["master"], "El PDF debe registrar páginas y dimensiones físicas.");
      }
      return;
    }

    if (asset.source.format === "pdf" || asset.master.format === "pdf") {
      addIssue(["master", "format"], "Una imagen no puede referenciar un PDF.");
    }
    const normalizedPath = /^src\/assets\/media\/[a-z0-9]+(?:-[a-z0-9]+)*--[a-f0-9]{12}\.(?:png|webp)$/u.test(asset.master.path);
    const legacyPath = asset.preservation.policy === "legacy-unverified"
      && /^src\/assets\/images\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:jpe?g|png|webp|avif|gif|tiff?)$/u.test(asset.master.path);
    if (!normalizedPath && !legacyPath) {
      addIssue(["master", "path"], "El máster raster debe estar bajo src/assets y no puede ser SVG.");
    }
    if (!asset.master.width || !asset.master.height || !asset.master.pages || asset.master.hasAlpha === undefined) {
      addIssue(["master"], "El máster raster debe registrar dimensiones, páginas y transparencia.");
    }
    if (asset.source.format === "tiff") {
      if (!asset.source.selectedPage || !asset.source.totalPages) {
        addIssue(["source"], "Un TIFF debe registrar explícitamente la página seleccionada.");
      }
    } else if (asset.source.selectedPage !== undefined || asset.source.totalPages !== undefined) {
      addIssue(["source"], "La selección de página solo corresponde a originales TIFF.");
    }
  }),
});

const publicationCuration = defineCollection({
  loader: glob({ base: "./content/publications", pattern: "*.json" }),
  schema: z.object({
    id: z.literal("publication-curation"),
    schemaVersion: z.literal(1),
    maximumFeatured: z.literal(5),
    protectedFields: z.array(z.string()),
    topics: z
      .array(
        z.object({
          id: z.enum([
            "cardiorespiratory-control",
            "neuroglia-signalling",
            "hypoxia-cardiovascular",
            "stress-adaptation",
          ]),
          label: localizedStringSchema,
          color: z.string().regex(/^#[0-9a-f]{6}$/iu),
          locked: z.literal(true),
        }),
      )
      .length(4),
    overrides: z.array(
      z.object({
        publicationId: z.string().min(1),
        doi: z.string().nullable(),
        featured: z.boolean(),
        featuredOrder: z.number().int().positive().nullable(),
        hidden: z.boolean(),
        topicIds: z.array(
          z.enum([
            "cardiorespiratory-control",
            "neuroglia-signalling",
            "hypoxia-cardiovascular",
            "stress-adaptation",
          ]),
        ),
        note: localizedStringSchema,
      }),
    ),
  }),
});

const outreachEntries = defineCollection({
  loader: glob({ base: "./content/outreach", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    id: z.string(),
    translationKey: z.string(),
    locale: localeSchema,
    type: z.enum(["article", "event", "resource"]),
    state: z.enum(["draft", "review", "published"]),
    slug: z.string(),
    title: z.string().min(1),
    summary: z.string().min(1),
    publishedAt: z.coerce.date().nullable(),
    updatedAt: z.coerce.date(),
    featured: z.boolean(),
    cover: z.string().nullable(),
    coverMedia: z.string().regex(/^content\/media\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u).nullable().optional(),
    attachmentMedia: z.string().regex(/^content\/media\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u).nullable().optional(),
    coverAlt: z.string().nullable(),
  }),
});

export const collections = {
  site,
  settings,
  pages,
  researchAreas,
  techniqueStages,
  grants,
  people,
  teamGroups,
  values,
  media,
  publicationCuration,
  outreachEntries,
};
