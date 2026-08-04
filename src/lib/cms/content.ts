import type { Locale, SiteContent } from "../../content-data/types";
import settingsDocument from "../../../content/settings/site.json";
import homePage from "../../../content/pages/home.json";
import researchPage from "../../../content/pages/research.json";
import techniquesPage from "../../../content/pages/techniques.json";
import teamPage from "../../../content/pages/team.json";
import publicationsPage from "../../../content/pages/publications.json";
import philosophyPage from "../../../content/pages/philosophy.json";
import outreachPage from "../../../content/pages/outreach.json";
import contactPage from "../../../content/pages/contact.json";
import publicationCurationDocument from "../../../content/publications/curation.json";
import {
  corePageKeys,
  type CmsPageKey,
  type CmsWorkspace,
  type MediaAsset,
  type PageDocument,
  type PublicationCurationDocument,
  type SiteSettings,
  type ValidationResult,
} from "./models";
import {
  assertValidSiteContent,
  mergeValidationResults,
  validateMediaAsset,
  validatePageDocument,
  validatePublicationCuration,
  validateSiteSettings,
} from "./validation";

type EntityDocument = Readonly<
  Record<string, unknown> & {
    readonly id: string;
    readonly order?: number;
    readonly translations: Readonly<Record<Locale, Readonly<Record<string, unknown>>>>;
  }
>;

type EntityModuleMap = Readonly<Record<string, unknown>>;

const entityModuleMaps = {
  researchAreas: import.meta.glob("../../../content/entities/research-areas/*.json", {
    eager: true,
    import: "default",
  }),
  techniqueStages: import.meta.glob("../../../content/entities/technique-stages/*.json", {
    eager: true,
    import: "default",
  }),
  grants: import.meta.glob("../../../content/entities/grants/*.json", {
    eager: true,
    import: "default",
  }),
  people: import.meta.glob("../../../content/entities/people/*.json", {
    eager: true,
    import: "default",
  }),
  teamGroups: import.meta.glob("../../../content/entities/team-groups/*.json", {
    eager: true,
    import: "default",
  }),
  values: import.meta.glob("../../../content/entities/values/*.json", {
    eager: true,
    import: "default",
  }),
} as const satisfies Readonly<Record<string, EntityModuleMap>>;

const mediaModuleMap = import.meta.glob("../../../content/media/*.json", {
  eager: true,
  import: "default",
});

const entityIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function idFromModulePath(modulePath: string): string {
  const filename = modulePath.split("/").at(-1) ?? "";
  return filename.replace(/\.json$/u, "");
}

/**
 * Converts Vite glob results into editable entities without a record allowlist.
 * `order` is editorial metadata only: it controls presentation but is not added
 * to the legacy SiteContent objects consumed by the page components.
 */
export function collectEntityDocuments(modules: EntityModuleMap): readonly EntityDocument[] {
  const entries = Object.entries(modules).map(([modulePath, rawDocument]) => {
    if (!isRecord(rawDocument)) {
      throw new Error(`Entidad CMS inválida: ${modulePath}`);
    }

    const source = rawDocument;
    const explicitId = typeof source.id === "string" ? source.id.trim() : "";
    const id = explicitId || idFromModulePath(modulePath);
    const translations = source.translations;

    if (!entityIdPattern.test(id)) {
      throw new Error(`Entidad CMS con ID inválido: ${modulePath}`);
    }
    if (
      !isRecord(translations) ||
      !isRecord(translations.es) ||
      !isRecord(translations.en)
    ) {
      throw new Error(`Entidad CMS sin traducciones completas: ${modulePath}`);
    }
    if (
      source.order !== undefined &&
      source.order !== null &&
      (!Number.isInteger(source.order) || (source.order as number) < 1)
    ) {
      throw new Error(`Entidad CMS con orden inválido: ${modulePath}`);
    }

    return {
      modulePath,
      document: { ...source, id } as EntityDocument,
    };
  });

  const ids = new Set<string>();
  for (const { document, modulePath } of entries) {
    if (ids.has(document.id)) {
      throw new Error(`ID de entidad CMS duplicado «${document.id}»: ${modulePath}`);
    }
    ids.add(document.id);
  }

  return entries.sort((left, right) => {
    const leftOrder = left.document.order;
    const rightOrder = right.document.order;
    const leftHasOrder = Number.isFinite(leftOrder);
    const rightHasOrder = Number.isFinite(rightOrder);

    if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) {
      return leftOrder! - rightOrder!;
    }
    if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;
    return left.modulePath.localeCompare(right.modulePath, "en");
  })
    .map(({ document }) => document);
}

const settings = settingsDocument as unknown as SiteSettings;

const pages = {
  home: homePage,
  research: researchPage,
  techniques: techniquesPage,
  team: teamPage,
  publications: publicationsPage,
  philosophy: philosophyPage,
  outreach: outreachPage,
  contact: contactPage,
} as unknown as Readonly<Record<CmsPageKey, PageDocument>>;

const researchAreaDocuments = collectEntityDocuments(entityModuleMaps.researchAreas);
const techniqueStageDocuments = collectEntityDocuments(entityModuleMaps.techniqueStages);
const grantDocuments = collectEntityDocuments(entityModuleMaps.grants);
const personDocuments = collectEntityDocuments(entityModuleMaps.people).map((document) => {
  if (typeof document.group !== "string") {
    throw new Error(`Persona CMS sin grupo válido: ${document.id}`);
  }
  const group = idFromModulePath(document.group);
  if (!entityIdPattern.test(group)) {
    throw new Error(`Persona CMS con referencia de grupo inválida: ${document.id}`);
  }
  return { ...document, group };
});
const teamGroupDocuments = collectEntityDocuments(entityModuleMaps.teamGroups);
const valueDocuments = collectEntityDocuments(entityModuleMaps.values);

const media = Object.entries(mediaModuleMap)
  .sort(([left], [right]) => left.localeCompare(right, "en"))
  .map(([, document]) => document as MediaAsset);

const publicationCuration =
  publicationCurationDocument as unknown as PublicationCurationDocument;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function localized(
  source: EntityDocument,
  locale: Locale,
): Record<string, unknown> {
  const { translations, order: _editorialOrder, ...stable } = source;
  return { ...stable, ...translations[locale] };
}

function localizeText(
  value: Readonly<Record<Locale, string>>,
  locale: Locale,
): string {
  return value[locale];
}

/**
 * Reconstructs the exact legacy SiteContent contract from editable documents.
 * Existing Astro components can replace their current getContent import with this
 * function without changing their props or markup.
 */
export function getCmsContent(locale: Locale): SiteContent {
  const result: Record<string, unknown> = {};
  const language = settings.languages[locale];

  result.locale = locale;
  result.htmlLang = language.htmlLang;
  result.languageName = language.languageName;
  result.alternateLanguageLabel = language.alternateLanguageLabel;
  result.routes = Object.fromEntries(
    corePageKeys.map((pageKey) => [pageKey, settings.routes[pageKey][locale]]),
  );
  result.brand = {
    name: localizeText(settings.brand.name, locale),
    scientificName: localizeText(settings.brand.scientificName, locale),
    shortDescription: localizeText(settings.brand.shortDescription, locale),
    logoAlt: localizeText(settings.brand.logoAlt, locale),
    primaryLogo: settings.brand.primaryLogo,
    horizontalLogo: settings.brand.horizontalLogo,
  };
  result.navigation = {
    ariaLabel: localizeText(settings.navigation.ariaLabel, locale),
    openMenuLabel: localizeText(settings.navigation.openMenuLabel, locale),
    closeMenuLabel: localizeText(settings.navigation.closeMenuLabel, locale),
    laboratoryMenuLabel: localizeText(settings.navigation.laboratoryMenuLabel, locale),
    languageSwitcherLabel: localizeText(settings.navigation.languageSwitcherLabel, locale),
    items: settings.navigation.items.map(({ page, menu, label }) => ({
      page,
      label: localizeText(label, locale),
      menu,
    })),
  };
  result.common = {
    skipToContent: localizeText(settings.common.skipToContent, locale),
    readMore: localizeText(settings.common.readMore, locale),
    learnMore: localizeText(settings.common.learnMore, locale),
    backToHome: localizeText(settings.common.backToHome, locale),
    stateLabels: {
      published: localizeText(settings.common.stateLabels.published, locale),
      forthcoming: localizeText(settings.common.stateLabels.forthcoming, locale),
    },
  };
  result.footer = {
    description: localizeText(settings.footer.description, locale),
    navigationLabel: localizeText(settings.footer.navigationLabel, locale),
    contactLabel: localizeText(settings.footer.contactLabel, locale),
    location: localizeText(settings.footer.location, locale),
    affiliation: localizeText(settings.footer.affiliation, locale),
    copyright: localizeText(settings.footer.copyright, locale),
  };

  const seo: Record<string, unknown> = {};
  for (const pageKey of corePageKeys) {
    const page = pages[pageKey];
    result[pageKey] = cloneJson(page.content[locale]);
    seo[pageKey] = cloneJson(page.seo[locale]);
  }
  result.seo = seo;

  const researchAreas = researchAreaDocuments.map((document) => localized(document, locale));
  const techniqueStages = techniqueStageDocuments.map((document) => localized(document, locale));
  const grants = grantDocuments.map((document) => localized(document, locale));
  const teamGroups = teamGroupDocuments.map((document) => localized(document, locale));
  const people = personDocuments.map((document) => localized(document, locale));
  const values = valueDocuments.map((document) => localized(document, locale));

  const home = result.home as Record<string, unknown>;
  home.researchAreas = researchAreas;
  home.pipelineStages = techniqueStages.map(({ id, number, verb }) => ({ id, number, verb }));

  const research = result.research as Record<string, unknown>;
  research.areas = researchAreas;
  research.grants = grants;

  (result.techniques as Record<string, unknown>).stages = techniqueStages;
  (result.team as Record<string, unknown>).groups = teamGroups;
  (result.team as Record<string, unknown>).members = people;
  (result.philosophy as Record<string, unknown>).values = values;

  assertValidSiteContent(result);
  return result;
}

export const getEditableContent = getCmsContent;

export function getSiteSettings(): SiteSettings {
  return settings;
}

export function getPageDocument(pageKey: CmsPageKey): PageDocument {
  return pages[pageKey];
}

export function getPageDocuments(): Readonly<Record<CmsPageKey, PageDocument>> {
  return pages;
}

export function getPublicationCuration(): PublicationCurationDocument {
  return publicationCuration;
}

export function getMediaAssets(): readonly MediaAsset[] {
  return media;
}

export function getCmsWorkspace(): CmsWorkspace {
  return { settings, pages, publicationCuration, media };
}

export function validateCmsWorkspace(): ValidationResult {
  return mergeValidationResults(
    validateSiteSettings(settings),
    ...corePageKeys.map((pageKey) => validatePageDocument(pages[pageKey])),
    validatePublicationCuration(publicationCuration),
    ...media.map(validateMediaAsset),
  );
}

export function assertCmsWorkspaceValid(): void {
  const validation = validateCmsWorkspace();
  const errors = validation.issues.filter(({ severity }) => severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map(({ path, message }) => path + ": " + message).join("\n"));
  }
}
