import type { SiteContent } from "../../content-data/types";
import publicationCatalogDocument from "../../content-data/publications.generated.json";
import { isMediaManifest, mediaMetadataComplete } from "../media";
import {
  corePageKeys,
  publicationTopicIds,
  type CmsPageKey,
  type MediaAsset,
  type PageDocument,
  type PublicationCurationDocument,
  type SectionBlockType,
  type SiteSettings,
  type ValidationIssue,
  type ValidationResult,
} from "./models";

const canonicalRoutes: Readonly<Record<CmsPageKey, { readonly es: string; readonly en: string }>> = {
  home: { es: "/", en: "/en/" },
  research: { es: "/investigacion/", en: "/en/research/" },
  techniques: { es: "/tecnicas/", en: "/en/techniques/" },
  team: { es: "/equipo/", en: "/en/team/" },
  publications: { es: "/publicaciones/", en: "/en/publications/" },
  philosophy: { es: "/filosofia/", en: "/en/philosophy/" },
  outreach: { es: "/divulgacion/", en: "/en/outreach/" },
  contact: { es: "/contacto/", en: "/en/contact/" },
};

const requiredPublicationFields = [
  "title",
  "authors",
  "doi",
  "openAlexId",
  "edges",
  "weights",
  "positions",
] as const;

const catalogPublicationIds = new Set(
  publicationCatalogDocument.works.flatMap((work) => {
    const id = work.openalex_id?.split("/").at(-1);
    return id ? [id] : [];
  }),
);

const pageBlockTypes: Readonly<Record<CmsPageKey, readonly SectionBlockType[]>> = {
  home: ["hero", "publicEntry", "researchPreview", "imageRegister", "techniquesPreview", "fundingPreview", "publicationsPreview", "teamPreview", "callToAction"],
  research: ["hero", "researchAreas", "funding"],
  techniques: ["hero", "techniqueStages", "closing"],
  team: ["hero", "teamDirectory"],
  publications: ["hero", "publicationNetwork", "publicationCatalog", "provenance"],
  philosophy: ["hero", "statement", "values"],
  outreach: ["hero", "outreachFeed", "status"],
  contact: ["hero", "contactDetails", "contactForm", "map", "callToAction"],
};

const requiredPageBlockTypes: Readonly<Record<CmsPageKey, readonly SectionBlockType[]>> = {
  home: ["hero"],
  research: ["hero", "researchAreas"],
  techniques: ["hero", "techniqueStages"],
  team: ["hero", "teamDirectory"],
  publications: ["hero", "publicationNetwork", "publicationCatalog"],
  philosophy: ["hero", "statement", "values"],
  outreach: ["hero"],
  contact: ["hero", "contactDetails", "contactForm"],
};

function issue(
  issues: ValidationIssue[],
  severity: ValidationIssue["severity"],
  path: string,
  message: string,
): void {
  issues.push({ severity, path, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function finalResult(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: !issues.some(({ severity }) => severity === "error"),
    issues,
  };
}

export function validateSiteSettings(settings: SiteSettings): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (settings.id !== "site" || settings.schemaVersion !== 1) {
    issue(issues, "error", "settings", "La configuración global tiene un identificador o versión inválidos.");
  }

  for (const pageKey of corePageKeys) {
    const route = settings.routes[pageKey];
    const expected = canonicalRoutes[pageKey];
    if (!route?.locked || route.es !== expected.es || route.en !== expected.en) {
      issue(
        issues,
        "error",
        `settings.routes.${pageKey}`,
        "Las rutas centrales son estables y no se pueden modificar desde el editor.",
      );
    }
  }

  const navPages = new Set<string>();
  for (const [index, item] of settings.navigation.items.entries()) {
    const path = `settings.navigation.items.${index}`;
    if (navPages.has(item.page)) {
      issue(issues, "error", path, `La página «${item.page}» aparece más de una vez en la navegación.`);
    }
    navPages.add(item.page);
    if (!isNonEmptyString(item.label.es) || !isNonEmptyString(item.label.en)) {
      issue(issues, "error", `${path}.label`, "Cada enlace de navegación requiere etiqueta en español e inglés.");
    }
  }

  for (const [key, value] of Object.entries(settings.brand)) {
    if (isRecord(value) && "es" in value && "en" in value) {
      if (!isNonEmptyString(value.es) || !isNonEmptyString(value.en)) {
        issue(issues, "error", `settings.brand.${key}`, "La identidad del laboratorio debe estar completa en ambos idiomas.");
      }
    }
  }

  return finalResult(issues);
}

export function validatePageDocument(page: PageDocument): ValidationResult {
  const issues: ValidationIssue[] = [];
  const prefix = `pages.${page.pageKey}`;

  if (page.pageKey !== page._template || !corePageKeys.includes(page.pageKey)) {
    issue(issues, "error", `${prefix}.pageKey`, "La plantilla y la clave estable de la página no coinciden.");
  }

  const expectedRoute = canonicalRoutes[page.pageKey];
  if (
    !page.routesLocked ||
    page.route.es !== expectedRoute.es ||
    page.route.en !== expectedRoute.en
  ) {
    issue(issues, "error", `${prefix}.route`, "La ruta de una página central no se puede modificar.");
  }

  for (const locale of ["es", "en"] as const) {
    const seo = page.seo[locale];
    if (!isNonEmptyString(seo.title) || !isNonEmptyString(seo.description)) {
      issue(issues, "error", `${prefix}.seo.${locale}`, "Título y descripción SEO son obligatorios.");
    }
    if (seo.title.length > 70) {
      issue(issues, "warning", `${prefix}.seo.${locale}.title`, "El título SEO supera 70 caracteres.");
    }
    if (seo.description.length > 180) {
      issue(issues, "warning", `${prefix}.seo.${locale}.description`, "La descripción SEO supera 180 caracteres.");
    }
    if (!isRecord(page.content[locale])) {
      issue(issues, "error", `${prefix}.content.${locale}`, "Falta el contenido localizado de la página.");
    }
  }

  const blockIds = new Set<string>();
  const blockOrders = new Set<number>();
  const blockTypes = new Set<SectionBlockType>();
  const allowedBlockTypes = new Set(pageBlockTypes[page.pageKey]);
  for (const [index, block] of page.blocks.entries()) {
    const blockPath = `${prefix}.blocks.${index}`;
    if (!isNonEmptyString(block.id) || blockIds.has(block.id)) {
      issue(issues, "error", `${blockPath}.id`, "Los bloques necesitan identificadores estables y únicos.");
    }
    blockIds.add(block.id);
    if (!allowedBlockTypes.has(block.type)) {
      issue(issues, "error", `${blockPath}.type`, `El bloque «${block.type}» no pertenece a esta página.`);
    } else if (blockTypes.has(block.type)) {
      issue(issues, "error", `${blockPath}.type`, `El bloque «${block.type}» no puede repetirse.`);
    }
    blockTypes.add(block.type);
    if (!Number.isInteger(block.order) || block.order < 1 || blockOrders.has(block.order)) {
      issue(issues, "error", `${blockPath}.order`, "El orden de los bloques debe ser positivo y único.");
    }
    blockOrders.add(block.order);
    if (block.locked && !block.enabled) {
      issue(issues, "error", `${blockPath}.enabled`, "Un bloque estructural protegido no puede desactivarse.");
    }
  }

  for (const requiredType of requiredPageBlockTypes[page.pageKey]) {
    const structural = page.blocks.find(({ type }) => type === requiredType);
    if (!structural || !structural.locked) {
      issue(issues, "error", `${prefix}.blocks`, `El bloque estructural «${requiredType}» no se puede eliminar ni desbloquear.`);
    }
  }

  if (!page.blocks.some(({ type, enabled }) => type === "hero" && enabled)) {
    issue(issues, "error", `${prefix}.blocks`, "Cada página central debe conservar su bloque hero.");
  }

  return finalResult(issues);
}

export function validatePublicationCuration(
  curation: PublicationCurationDocument,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (curation.maximumFeatured !== 5) {
    issue(issues, "error", "publicationCuration.maximumFeatured", "El máximo de publicaciones destacadas debe ser cinco.");
  }
  if (curation.topics.length !== 4) {
    issue(issues, "error", "publicationCuration.topics", "El grafo debe conservar exactamente cuatro tópicos.");
  }

  const topicIds = new Set(curation.topics.map(({ id }) => id));
  if (
    topicIds.size !== publicationTopicIds.length ||
    publicationTopicIds.some((id) => !topicIds.has(id))
  ) {
    issue(issues, "error", "publicationCuration.topics", "Los cuatro identificadores científicos de tópico están protegidos.");
  }

  for (const [index, topic] of curation.topics.entries()) {
    if (!/^#[0-9a-f]{6}$/iu.test(topic.color)) {
      issue(issues, "error", `publicationCuration.topics.${index}.color`, "El color debe expresarse como hexadecimal de seis dígitos.");
    }
    if (!topic.locked) {
      issue(issues, "error", `publicationCuration.topics.${index}.locked`, "Los tópicos son estructurales y no se pueden eliminar.");
    }
  }

  const featured = curation.overrides.filter(({ featured }) => featured);
  if (featured.length > curation.maximumFeatured) {
    issue(issues, "error", "publicationCuration.overrides", "Hay más de cinco publicaciones destacadas.");
  }

  const workIds = new Set<string>();
  const featureOrders = new Set<number>();
  for (const [index, override] of curation.overrides.entries()) {
    const path = `publicationCuration.overrides.${index}`;
    if (workIds.has(override.publicationId)) {
      issue(issues, "error", `${path}.publicationId`, "Cada publicación puede tener una sola curaduría.");
    }
    workIds.add(override.publicationId);
    if (!catalogPublicationIds.has(override.publicationId)) {
      issue(issues, "error", `${path}.publicationId`, "La publicación seleccionada ya no existe en el catálogo bibliográfico.");
    }
    if (override.featured) {
      if (!Number.isInteger(override.featuredOrder) || (override.featuredOrder ?? 0) < 1) {
        issue(issues, "error", `${path}.featuredOrder`, "Una publicación destacada necesita una posición positiva.");
      } else if (featureOrders.has(override.featuredOrder!)) {
        issue(issues, "error", `${path}.featuredOrder`, "La posición destacada no puede repetirse.");
      } else {
        featureOrders.add(override.featuredOrder!);
      }
    }
    for (const topicId of override.topicIds) {
      if (!topicIds.has(topicId)) {
        issue(issues, "error", `${path}.topicIds`, `El tópico «${topicId}» no forma parte de los cuatro tópicos permitidos.`);
      }
    }
  }

  for (const field of requiredPublicationFields) {
    if (!curation.protectedFields.includes(field)) {
      issue(issues, "error", "publicationCuration.protectedFields", `El metadato bibliográfico «${field}» debe permanecer protegido.`);
    }
  }

  return finalResult(issues);
}

export function validateMediaAsset(asset: MediaAsset): ValidationResult {
  const issues: ValidationIssue[] = [];
  const prefix = "media." + asset.id;

  if (!isMediaManifest(asset)) {
    issue(issues, "error", prefix, "El manifiesto no cumple el contrato del importador de medios.");
    return finalResult(issues);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(asset.id)) {
    issue(issues, "error", prefix + ".id", "El identificador debe usar minúsculas, números y guiones.");
  }
  if (!isNonEmptyString(asset.editorial.alt.es) || !isNonEmptyString(asset.editorial.alt.en)) {
    issue(issues, "error", prefix + ".editorial.alt", "Cada medio publicado requiere texto alternativo en español e inglés.");
  }
  if (asset.focalPoint.x < 0 || asset.focalPoint.x > 100 || asset.focalPoint.y < 0 || asset.focalPoint.y > 100) {
    issue(issues, "error", prefix + ".focalPoint", "El punto focal debe estar entre 0 y 100 en ambos ejes.");
  }
  if (asset.kind === "micrograph" && !asset.source.originalStoredLocally) {
    issue(
      issues,
      "warning",
      prefix + ".source.originalStoredLocally",
      "El activo legado aún no tiene un original científico archivado; debe reimportarse antes de considerarlo verificado.",
    );
  }
  if (
    asset.status === "ready" &&
    !mediaMetadataComplete(asset)
  ) {
    issue(issues, "error", prefix + ".editorial", "Un medio listo para publicar debe completar texto alternativo, leyenda, crédito, técnica y procedencia en ambos idiomas.");
  }

  return finalResult(issues);
}

export function validateSiteContent(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    issue(issues, "error", "siteContent", "El documento de contenido no es un objeto.");
    return finalResult(issues);
  }

  if (value.locale !== "es" && value.locale !== "en") {
    issue(issues, "error", "siteContent.locale", "El idioma debe ser «es» o «en».");
  }
  for (const key of ["routes", "seo", "brand", "navigation", "common", "footer", ...corePageKeys]) {
    if (!isRecord(value[key])) {
      issue(issues, "error", `siteContent.${key}`, `Falta la sección obligatoria «${key}».`);
    }
  }

  if (isRecord(value.routes)) {
    const locale = value.locale === "en" ? "en" : "es";
    for (const pageKey of corePageKeys) {
      if (value.routes[pageKey] !== canonicalRoutes[pageKey][locale]) {
        issue(issues, "error", `siteContent.routes.${pageKey}`, "La ruta central no coincide con el contrato público.");
      }
    }
  }

  return finalResult(issues);
}

export function assertValidSiteContent(value: unknown): asserts value is SiteContent {
  const result = validateSiteContent(value);
  const errors = result.issues.filter(({ severity }) => severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map(({ path, message }) => `${path}: ${message}`).join("\n"));
  }
}

export function mergeValidationResults(...results: readonly ValidationResult[]): ValidationResult {
  return finalResult(results.flatMap(({ issues }) => issues));
}
