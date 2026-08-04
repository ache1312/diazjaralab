export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const pageIds = [
  "home",
  "research",
  "techniques",
  "team",
  "publications",
  "philosophy",
  "outreach",
  "contact",
] as const;

export type PageId = (typeof pageIds)[number];
export type EditorialState = "published" | "forthcoming";
/** Stable slug authored in the CMS (for example, `principal-investigator`). */
export type TeamGroupId = string;

export interface SeoContent {
  readonly title: string;
  readonly description: string;
}

export interface ActionLink {
  readonly label: string;
  readonly page: PageId;
}

export interface NavigationItem {
  readonly page: PageId;
  readonly label: string;
  readonly menu?: "primary" | "laboratory";
}

/** A static Tina relation path or the related manifest object returned live. */
export type CmsMediaReference = string | Readonly<{
  readonly id?: string;
  readonly custom_id?: string;
  readonly _sys?: Readonly<{ path?: string }>;
}>;

export interface ResearchArea {
  readonly id: string;
  readonly imageMedia?: CmsMediaReference | null;
  readonly image?: string | null;
  readonly number: string;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly imageAlt: string;
  readonly figureCaption: string;
  readonly question: string;
  readonly hypothesis: string;
  readonly systems: readonly string[];
  readonly measurements: readonly string[];
  readonly status: string;
  readonly relatedDois: readonly string[];
}

export interface Grant {
  readonly id: string;
  readonly agency: string;
  readonly number: string;
  readonly title: string;
  readonly officialTitle: string;
  readonly officialLang: "es" | "en";
  readonly principalInvestigatorLabel: string;
  readonly principalInvestigator: string;
  readonly endDateLabel: string;
  readonly endDate: string;
  readonly endDateIso: string;
  readonly state: EditorialState;
}

export interface TechniqueCapability {
  readonly label: string;
  readonly kind: string;
}

export interface TechniqueStage {
  readonly id: string;
  readonly number: string;
  readonly verb: string;
  readonly title: string;
  readonly question?: string;
  readonly description: string;
  readonly items: readonly (string | TechniqueCapability)[];
  readonly scope: string;
  readonly output: string;
  readonly accent: "amber" | "teal" | "cyan" | "navy";
}

export interface TeamMember {
  readonly id: string;
  readonly portraitMedia?: CmsMediaReference | null;
  readonly name: string;
  readonly group: TeamGroupId;
  readonly role: string;
  readonly credentials: string;
  readonly institution?: string;
  readonly bio: readonly string[];
  readonly research?: string;
  readonly portrait: string | null;
  readonly portraitAlt: string | null;
  readonly state: EditorialState;
  readonly statusLabel?: string;
}

export interface TeamGroup {
  readonly id: TeamGroupId;
  readonly label: string;
}

export interface LabValue {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

export interface ProfileLink {
  readonly id: "openalex" | "google-scholar";
  readonly label: string;
  readonly href: string | null;
  readonly state: EditorialState;
}

export interface SiteContent {
  /** Request-scoped Tina sources. Present only while the local editor is open. */
  readonly _tina?: {
    readonly page?: unknown;
    readonly settings?: unknown;
  };
  readonly locale: Locale;
  readonly htmlLang: string;
  readonly languageName: string;
  readonly alternateLanguageLabel: string;
  readonly routes: Readonly<Record<PageId, string>>;
  readonly seo: Readonly<Record<PageId, SeoContent>>;
  readonly brand: {
    readonly name: string;
    readonly scientificName: string;
    readonly shortDescription: string;
    readonly logoAlt: string;
    readonly primaryLogo?: string;
    readonly horizontalLogo?: string;
  };
  readonly navigation: {
    readonly ariaLabel: string;
    readonly openMenuLabel: string;
    readonly closeMenuLabel: string;
    readonly laboratoryMenuLabel: string;
    readonly languageSwitcherLabel: string;
    readonly items: readonly NavigationItem[];
  };
  readonly common: {
    readonly skipToContent: string;
    readonly readMore: string;
    readonly learnMore: string;
    readonly backToHome: string;
    readonly stateLabels: Readonly<Record<EditorialState, string>>;
  };
  readonly home: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly affiliation: string;
    readonly location: string;
    readonly primaryAction: ActionLink;
    readonly secondaryAction: ActionLink;
    readonly heroActionsLabel: string;
    readonly heroFacts: readonly {
      readonly label: string;
      readonly value: string;
    }[];
    readonly heroImageAlt: string;
    readonly heroImageCaption: string;
    readonly media: {
      readonly hero: CmsMediaReference;
      readonly registerOne: CmsMediaReference;
      readonly registerTwo: CmsMediaReference;
      readonly registerThree: CmsMediaReference;
      readonly teamEsteban: CmsMediaReference;
      readonly teamSinay: CmsMediaReference;
    };
    readonly publicEntry: {
      readonly eyebrow: string;
      readonly title: string;
      readonly introduction: string;
      readonly body: readonly string[];
      readonly questionLabel: string;
      readonly question: string;
      readonly glossaryLabel: string;
      readonly glossary: readonly {
        readonly term: string;
        readonly definition: string;
      }[];
      readonly scopeLabel: string;
      readonly scope: string;
      readonly linksLabel: string;
      readonly links: readonly ActionLink[];
    };
    readonly imageRegister: {
      readonly label: string;
      readonly title: string;
      readonly introduction: string;
      readonly statusLabel: string;
      readonly status: string;
      readonly criterionLabel: string;
      readonly criterion: string;
      readonly figures: readonly {
        readonly code: string;
        readonly title: string;
        readonly note: string;
        readonly alt: string;
      }[];
    };
    readonly researchEyebrow: string;
    readonly researchTitle: string;
    readonly researchIntroduction: string;
    readonly researchAreas: readonly ResearchArea[];
    readonly pipelineEyebrow: string;
    readonly pipelineTitle: string;
    readonly pipelineIntroduction: string;
    readonly pipelineStages: readonly Pick<TechniqueStage, "id" | "number" | "verb">[];
    readonly fundingEyebrow: string;
    readonly fundingTitle: string;
    readonly fundingIntroduction: string;
    readonly publicationsEyebrow: string;
    readonly publicationsTitle: string;
    readonly publicationsIntroduction: string;
    readonly publicationsActionLabel: string;
    readonly publicationLinkLabel: string;
    readonly openAccessLabel: string;
    readonly singleCitationLabel: string;
    readonly citationsLabel: string;
    readonly publicationAuthorsContinuation: string;
    readonly teamEyebrow: string;
    readonly teamTitle: string;
    readonly teamIntroduction: string;
    readonly teamPortraitAlt: {
      readonly principalInvestigator: string;
      readonly laboratoryCoordinator: string;
    };
    readonly teamActionLabel: string;
    readonly joinEyebrow: string;
    readonly joinTitle: string;
    readonly joinIntroduction: string;
    readonly joinAction: ActionLink;
  };
  readonly research: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly media: {
      readonly brainstemCircuits: CmsMediaReference;
      readonly respiratoryNeurodynamics: CmsMediaReference;
      readonly diseaseNeurophysiology: CmsMediaReference;
    };
    readonly asideLabel: string;
    readonly asideText: string;
    readonly questionLabel: string;
    readonly hypothesisLabel: string;
    readonly systemsLabel: string;
    readonly measurementsLabel: string;
    readonly contextLabel: string;
    readonly relatedEvidenceLabel: string;
    readonly areas: readonly ResearchArea[];
    readonly fundingEyebrow: string;
    readonly fundingTitle: string;
    readonly fundingIntroduction: string;
    readonly grants: readonly Grant[];
  };
  readonly techniques: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly media?: {
      readonly evidencePrimary: CmsMediaReference;
      readonly evidenceSecondary: CmsMediaReference;
    };
    readonly railLabel: string;
    readonly asideText: string;
    readonly questionLabel?: string;
    readonly scopeLabel: string;
    readonly outputLabel: string;
    readonly methodsLabel: string;
    readonly stages: readonly TechniqueStage[];
    readonly evidenceEyebrow?: string;
    readonly evidenceTitle?: string;
    readonly evidenceIntroduction?: string;
    readonly evidencePrimaryCaption?: string;
    readonly evidenceSecondaryCaption?: string;
    readonly evidenceNote?: string;
    readonly closingEyebrow: string;
    readonly closingTitle: string;
    readonly closingText: string;
    readonly integrationLabel?: string;
    readonly integrationSteps?: readonly string[];
    readonly closingActionLabel?: string;
  };
  readonly team: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly media: {
      readonly estebanDiazJara: CmsMediaReference;
      readonly sinayVicencio: CmsMediaReference;
    };
    readonly asideLabel: string;
    readonly asideText: string;
    readonly scientificResponsibilityLabel: string;
    readonly profileLinksLabel: string;
    readonly groups: readonly TeamGroup[];
    readonly members: readonly TeamMember[];
  };
  readonly publications: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly profilesTitle: string;
    readonly profiles: readonly ProfileLink[];
    readonly status: EditorialState;
    readonly statusTitle: string;
    readonly statusText: string;
    readonly emptyListLabel: string;
    readonly metrics: {
      readonly ariaLabel: string;
      readonly papers: string;
      readonly works: string;
      readonly citations: string;
      readonly hIndex: string;
      readonly openAccess: string;
    };
    readonly network: {
      readonly eyebrow: string;
      readonly title: string;
      readonly introduction: string;
      readonly papers: string;
      readonly themes: string;
      readonly contentsLabel: string;
      readonly graphLabel: string;
      readonly focusLabel: string;
      readonly complete: string;
      readonly export: string;
      readonly paperLegend: string;
      readonly sizeLegend: string;
      readonly recentLegend: string;
      readonly relationLegend: string;
      readonly selectedPaper: string;
      readonly selectedTheme: string;
      readonly citations: string;
      readonly topicHeading: string;
      readonly connectedHeading: string;
      readonly connectionOrder: string;
      readonly exploreConnection: string;
      readonly noConnections: string;
      readonly source: string;
      readonly catalogue: string;
      readonly inferredTheme: string;
      readonly themeNote: string;
      readonly method: string;
      readonly nodePaper: string;
      readonly nodeTheme: string;
      readonly legendLabel: string;
    };
    readonly catalogue: {
      readonly eyebrow: string;
      readonly title: string;
      readonly introduction: string;
      readonly filterLabel: string;
      readonly filterArticles: string;
      readonly filterAbstracts: string;
      readonly filterOther: string;
      readonly filterAll: string;
      readonly searchLabel: string;
      readonly searchPlaceholder: string;
      readonly sortLabel: string;
      readonly sortCurated: string;
      readonly sortNewest: string;
      readonly sortCited: string;
      readonly sortOldest: string;
      readonly topicLabel: string;
      readonly topicAll: string;
      readonly featured: string;
      readonly shown: string;
      readonly citedBy: string;
      readonly scholar: string;
      readonly openAlex: string;
      readonly doi: string;
      readonly openAccess: string;
      readonly sourceCrossed: string;
      readonly sourceScholar: string;
      readonly downloadBib: string;
      readonly scholarOnlyNote: string;
      readonly backToFilters: string;
    };
    readonly typeLabels: {
      readonly journalArticle: string;
      readonly review: string;
      readonly conferenceAbstract: string;
      readonly conferenceProceedingsChapter: string;
      readonly correction: string;
      readonly doctoralThesis: string;
    };
    readonly provenance: {
      readonly eyebrow: string;
      readonly updatedLabel: string;
      readonly sourcesLabel: string;
      readonly sources: readonly {
        readonly label: string;
        readonly href: string;
      }[];
    };
  };
  readonly philosophy: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly asideLabel: string;
    readonly asideText: string;
    readonly generalCriterionLabel: string;
    readonly statement: string;
    readonly missionLabel: string;
    readonly mission: string;
    readonly visionLabel: string;
    readonly vision: string;
    readonly valuesEyebrow: string;
    readonly valuesTitle: string;
    readonly valuesIntroduction: string;
    readonly values: readonly LabValue[];
  };
  readonly outreach: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly status: EditorialState;
    readonly statusTitle: string;
    readonly statusText: string;
    readonly archive: {
      readonly eyebrow: string;
      readonly title: string;
      readonly introduction: string;
      readonly publishedEntrySingular: string;
      readonly publishedEntryPlural: string;
      readonly emptyAsideText: string;
      readonly comingSoonLabel: string;
      readonly readLabel: string;
      readonly articleLabel: string;
      readonly eventLabel: string;
      readonly resourceLabel: string;
    };
    readonly entry: {
      readonly section: string;
      readonly back: string;
      readonly published: string;
      readonly updated: string;
      readonly language: string;
      readonly languageValue: string;
      readonly editorial: string;
      readonly editorialText: string;
      readonly more: string;
      readonly research: string;
      readonly contact: string;
      readonly attachmentLabel: string;
      readonly pagesLabel: string;
    };
    readonly statusPrimaryAction: ActionLink;
    readonly statusSecondaryAction: ActionLink;
    readonly instagramLabel: string;
    readonly instagramHref: string | null;
    readonly instagramStatus: EditorialState;
  };
  readonly contact: {
    readonly eyebrow: string;
    readonly title: string;
    readonly introduction: string;
    readonly asideLabel: string;
    readonly locationTitle: string;
    readonly institution: string;
    readonly center: string;
    readonly faculty: string;
    readonly laboratory: string;
    readonly streetAddress: string;
    readonly mapEyebrow: string;
    readonly mapTitle: string;
    readonly mapIframeTitle: string;
    readonly mapLoadLabel: string;
    readonly mapExternalLabel: string;
    readonly mapQuery: string;
    readonly directEmailLabel: string;
    readonly email: string;
    readonly form: {
      readonly title: string;
      readonly introduction: string;
      readonly nameLabel: string;
      readonly namePlaceholder: string;
      readonly emailLabel: string;
      readonly emailPlaceholder: string;
      readonly messageLabel: string;
      readonly messagePlaceholder: string;
      readonly submitLabel: string;
      readonly submittingLabel: string;
      readonly successTitle: string;
      readonly successMessage: string;
      readonly errorTitle: string;
      readonly errorMessage: string;
      readonly requiredMessage: string;
      readonly invalidEmailMessage: string;
      readonly unavailableMessage: string;
      readonly fallbackHint: string;
      readonly fallbackSubject: string;
      readonly fallbackNameLabel: string;
      readonly fallbackEmailLabel: string;
      readonly honeypotLabel: string;
    };
    readonly join: {
      readonly eyebrow: string;
      readonly title: string;
      readonly paragraphs: readonly string[];
      readonly actionLabel: string;
      readonly emailSubject: string;
    };
  };
  readonly footer: {
    readonly description: string;
    readonly navigationLabel: string;
    readonly contactLabel: string;
    readonly location: string;
    readonly affiliation: string;
    readonly copyright: string;
  };
}
