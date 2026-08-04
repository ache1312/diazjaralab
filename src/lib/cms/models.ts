import type { Locale, PageId } from "../../content-data/types";
import type { MediaManifest } from "../media/types";

export const cmsLocales = ["es", "en"] as const satisfies readonly Locale[];
export const corePageKeys = [
  "home",
  "research",
  "techniques",
  "team",
  "publications",
  "philosophy",
  "outreach",
  "contact",
] as const satisfies readonly PageId[];

export type Localized<T> = Readonly<Record<Locale, T>>;
export type CmsPageKey = (typeof corePageKeys)[number];
export type CmsContentState = "draft" | "published" | "forthcoming";
export type OutreachType = "article" | "event" | "resource";
export type OutreachState = "draft" | "review" | "published";

export interface LocalizedText {
  readonly es: string;
  readonly en: string;
}

export interface LockedRoute extends LocalizedText {
  readonly locked: true;
}

export interface SiteSettings {
  readonly id: "site";
  readonly schemaVersion: 1;
  readonly defaultLocale: Locale;
  readonly languages: Readonly<
    Record<
      Locale,
      {
        readonly htmlLang: string;
        readonly languageName: string;
        readonly alternateLanguageLabel: string;
      }
    >
  >;
  readonly routes: Readonly<Record<CmsPageKey, LockedRoute>>;
  readonly brand: {
    readonly name: LocalizedText;
    readonly scientificName: LocalizedText;
    readonly shortDescription: LocalizedText;
    readonly logoAlt: LocalizedText;
    readonly primaryLogo: string;
    readonly horizontalLogo: string;
  };
  readonly navigation: {
    readonly ariaLabel: LocalizedText;
    readonly openMenuLabel: LocalizedText;
    readonly closeMenuLabel: LocalizedText;
    readonly laboratoryMenuLabel: LocalizedText;
    readonly languageSwitcherLabel: LocalizedText;
    readonly items: readonly {
      readonly id: string;
      readonly page: CmsPageKey;
      readonly menu: "primary" | "laboratory";
      readonly label: LocalizedText;
    }[];
  };
  readonly common: {
    readonly skipToContent: LocalizedText;
    readonly readMore: LocalizedText;
    readonly learnMore: LocalizedText;
    readonly backToHome: LocalizedText;
    readonly stateLabels: {
      readonly published: LocalizedText;
      readonly forthcoming: LocalizedText;
    };
  };
  readonly footer: {
    readonly description: LocalizedText;
    readonly navigationLabel: LocalizedText;
    readonly contactLabel: LocalizedText;
    readonly location: LocalizedText;
    readonly affiliation: LocalizedText;
    readonly copyright: LocalizedText;
  };
}

export type SectionBlockType =
  | "hero"
  | "publicEntry"
  | "researchPreview"
  | "imageRegister"
  | "techniquesPreview"
  | "fundingPreview"
  | "publicationsPreview"
  | "teamPreview"
  | "callToAction"
  | "researchAreas"
  | "funding"
  | "techniqueStages"
  | "closing"
  | "teamDirectory"
  | "publicationNetwork"
  | "publicationCatalog"
  | "provenance"
  | "statement"
  | "values"
  | "outreachFeed"
  | "status"
  | "contactDetails"
  | "contactForm"
  | "map";

export interface SectionBlock {
  readonly id: string;
  readonly type: SectionBlockType;
  readonly enabled: boolean;
  readonly locked: boolean;
  readonly order: number;
  readonly variant: string;
}

export interface SeoTranslation {
  readonly title: string;
  readonly description: string;
}

export interface PageDocument<TContent extends Record<string, unknown> = Record<string, unknown>> {
  readonly _template: CmsPageKey;
  readonly pageKey: CmsPageKey;
  readonly schemaVersion: 1;
  readonly state: CmsContentState;
  readonly routesLocked: true;
  readonly route: LocalizedText;
  readonly seo: Localized<SeoTranslation>;
  readonly blocks: readonly SectionBlock[];
  readonly content: Localized<TContent>;
}

export type BilingualEntity<
  TStable extends Record<string, unknown>,
  TTranslation extends Record<string, unknown>,
> = TStable & {
  readonly translations: Localized<TTranslation>;
};

export interface OutreachEntry {
  readonly id: string;
  readonly translationKey: string;
  readonly locale: Locale;
  readonly type: OutreachType;
  readonly state: OutreachState;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly featured: boolean;
  readonly cover: string | null;
  readonly coverMedia?: string | null;
  readonly attachmentMedia?: string | null;
  readonly coverAlt: string | null;
}

export type MediaAsset = MediaManifest;

export const publicationTopicIds = [
  "cardiorespiratory-control",
  "neuroglia-signalling",
  "hypoxia-cardiovascular",
  "stress-adaptation",
] as const;

export type PublicationTopicId = (typeof publicationTopicIds)[number];

export interface PublicationTopic {
  readonly id: PublicationTopicId;
  readonly label: LocalizedText;
  readonly color: string;
  readonly locked: true;
}

export interface PublicationOverride {
  readonly publicationId: string;
  /** Mirror used only to help the editor identify a paper; the source DOI remains protected. */
  readonly doi: string | null;
  readonly featured: boolean;
  readonly featuredOrder: number | null;
  readonly hidden: boolean;
  readonly topicIds: readonly PublicationTopicId[];
  readonly note: LocalizedText;
}

export interface PublicationCurationDocument {
  readonly id: "publication-curation";
  readonly schemaVersion: 1;
  readonly maximumFeatured: 5;
  readonly protectedFields: readonly string[];
  readonly topics: readonly PublicationTopic[];
  readonly overrides: readonly PublicationOverride[];
}

export interface CmsWorkspace {
  readonly settings: SiteSettings;
  readonly pages: Readonly<Record<CmsPageKey, PageDocument>>;
  readonly publicationCuration: PublicationCurationDocument;
  readonly media: readonly MediaAsset[];
}

export interface ValidationIssue {
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}
