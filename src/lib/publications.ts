import generatedCatalog from '@/content-data/publications.generated.json';
import generatedNetwork from '@/content-data/publication-network.generated.json';
import publicationCurationDocument from '../../content/publications/curation.json';
import {
  publicationTopicIds,
  type PublicationCurationDocument,
  type PublicationOverride,
  type PublicationTopic,
  type PublicationTopicId,
} from '@/lib/cms/models';

export type PublicationDisplayType =
  | 'journal-article'
  | 'review'
  | 'conference-abstract'
  | 'conference-proceedings-chapter'
  | 'correction'
  | 'doctoral-thesis';

export type PublicationCluster =
  | 'neuroglia'
  | 'chemoreception'
  | 'breathing'
  | 'cardiovascular'
  | 'cellular';

export interface PublicationRecord {
  readonly title: string;
  readonly year: number;
  readonly publication_date: string;
  readonly display_year_recommended: number;
  readonly doi: string | null;
  readonly journal_or_source: string;
  readonly authors: readonly string[];
  readonly openalex_citations: number | null;
  readonly scholar_citations: number;
  readonly scholar_year: number;
  readonly scholar_detail_url: string;
  readonly scholar_duplicate_rows: number;
  readonly oa_status: string;
  readonly open_access_url: string | null;
  readonly openalex_type: string | null;
  readonly display_type: PublicationDisplayType;
  readonly openalex_id: string | null;
  readonly matched_author_ids: readonly string[];
  readonly merged_versions: readonly {
    readonly openalex_id: string | null;
    readonly doi: string | null;
    readonly type: string;
  }[];
  readonly notes?: string;
}

export interface PublicationCatalog {
  readonly generated_at: string;
  readonly identity: {
    readonly name: string;
    readonly scholar_user: string;
    readonly scholar_profile: string;
    readonly scholar_total_citations: number;
    readonly scholar_h_index: number;
    readonly scholar_i10_index: number;
    readonly openalex_author_ids: readonly string[];
    readonly canonical_openalex_author_id: string;
    readonly note: string;
  };
  readonly counts: {
    readonly canonical_works: number;
    readonly openalex_indexed: number;
    readonly scholar_only: number;
    readonly merged_preprint_versions: number;
    readonly by_display_type: Readonly<Record<PublicationDisplayType, number>>;
  };
  readonly works: readonly PublicationRecord[];
}

interface PublicationIdentity {
  readonly publicationId?: string | null;
  readonly openAlexId?: string | null;
  readonly doi?: string | null;
}

interface NetworkPaperTopicSource {
  readonly id: string;
  readonly kind: 'paper';
  readonly openAlexId?: string | null;
  readonly doi?: string | null;
  readonly topicIds: readonly string[];
}

interface PublicationNetworkTopicSource {
  readonly nodes: readonly ({ readonly kind: string } | NetworkPaperTopicSource)[];
}

export const sourcePublicationCatalog = generatedCatalog as unknown as PublicationCatalog;
export const publicationCuration = publicationCurationDocument as unknown as PublicationCurationDocument;

const normalizeOpenAlexId = (value: string | null | undefined) => {
  const id = value?.trim().split('/').filter(Boolean).at(-1)?.toLocaleUpperCase('en');
  return id && /^W\d+$/u.test(id) ? id : null;
};

const normalizeDoi = (value: string | null | undefined) => {
  const doi = value
    ?.trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//iu, '')
    .toLocaleLowerCase('en');
  return doi || null;
};

const identityKeys = ({ publicationId, openAlexId, doi }: PublicationIdentity) => {
  const keys: string[] = [];
  const openAlexKey = normalizeOpenAlexId(publicationId) ?? normalizeOpenAlexId(openAlexId);
  const doiKey = normalizeDoi(doi);
  if (openAlexKey) keys.push(`openalex:${openAlexKey}`);
  if (doiKey) keys.push(`doi:${doiKey}`);
  return keys;
};

const overridesByIdentity = new Map<string, PublicationOverride>();
for (const override of publicationCuration.overrides) {
  for (const key of identityKeys({ publicationId: override.publicationId, doi: override.doi })) {
    overridesByIdentity.set(key, override);
  }
}

export const getPublicationOverrideByIdentity = (identity: PublicationIdentity) => {
  for (const key of identityKeys(identity)) {
    const override = overridesByIdentity.get(key);
    if (override) return override;
  }
  return undefined;
};

const identityForWork = (work: PublicationRecord): PublicationIdentity => ({
  publicationId: work.openalex_id,
  doi: work.doi,
});

export const getPublicationOverride = (work: PublicationRecord) =>
  getPublicationOverrideByIdentity(identityForWork(work));

export const isPublicationHiddenByIdentity = (identity: PublicationIdentity) =>
  getPublicationOverrideByIdentity(identity)?.hidden === true;

export const isPublicationHidden = (work: PublicationRecord) =>
  isPublicationHiddenByIdentity(identityForWork(work));

export const isPublicationFeaturedByIdentity = (identity: PublicationIdentity) => {
  const override = getPublicationOverrideByIdentity(identity);
  return override?.featured === true && override.hidden !== true;
};

export const publicationFeaturedOrderByIdentity = (identity: PublicationIdentity) => {
  const override = getPublicationOverrideByIdentity(identity);
  return override?.featured && !override.hidden && override.featuredOrder != null
    ? override.featuredOrder
    : Number.POSITIVE_INFINITY;
};

const topicsById = new Map(publicationCuration.topics.map((topic) => [topic.id, topic]));
export const publicationTopics: readonly PublicationTopic[] = publicationTopicIds.map((id) => {
  const topic = topicsById.get(id);
  if (!topic) throw new Error(`Missing required publication topic: ${id}`);
  return topic;
});
export const publicationTopicById = new Map(publicationTopics.map((topic) => [topic.id, topic]));

const isPublicationTopicId = (value: string): value is PublicationTopicId =>
  publicationTopicIds.some((topicId) => topicId === value);

export const curatedTopicIdsByIdentity = (
  identity: PublicationIdentity,
  fallback: readonly string[] = [],
): readonly PublicationTopicId[] => {
  const configured = getPublicationOverrideByIdentity(identity)?.topicIds ?? fallback;
  return [...new Set(configured.filter(isPublicationTopicId))];
};

const generatedTopicsByIdentity = new Map<string, readonly PublicationTopicId[]>();
const networkSource = generatedNetwork as unknown as PublicationNetworkTopicSource;
for (const node of networkSource.nodes) {
  if (node.kind !== 'paper') continue;
  const paper = node as NetworkPaperTopicSource;
  const topicIds = curatedTopicIdsByIdentity(
    { publicationId: paper.id, openAlexId: paper.openAlexId, doi: paper.doi },
    paper.topicIds,
  );
  for (const key of identityKeys({ publicationId: paper.id, openAlexId: paper.openAlexId, doi: paper.doi })) {
    generatedTopicsByIdentity.set(key, topicIds);
  }
}

export const publicationTopicIdsFor = (work: PublicationRecord): readonly PublicationTopicId[] => {
  const identity = identityForWork(work);
  const fallback = identityKeys(identity)
    .map((key) => generatedTopicsByIdentity.get(key))
    .find((topicIds) => topicIds != null) ?? [];
  return curatedTopicIdsByIdentity(identity, fallback);
};

export const localizedPublicationTopicsFor = (work: PublicationRecord, locale: 'es' | 'en') =>
  publicationTopicIdsFor(work)
    .map((topicId) => publicationTopicById.get(topicId))
    .filter((topic): topic is PublicationTopic => topic != null)
    .map((topic) => ({ id: topic.id, label: topic.label[locale], color: topic.color }));

const visibleWorks = sourcePublicationCatalog.works.filter((work) => !isPublicationHidden(work));
const visibleCountsByType = Object.fromEntries(
  (Object.keys(sourcePublicationCatalog.counts.by_display_type) as PublicationDisplayType[])
    .map((type) => [type, visibleWorks.filter((work) => work.display_type === type).length]),
) as Readonly<Record<PublicationDisplayType, number>>;

/**
 * Public catalogue after applying editorial visibility. Bibliographic records are
 * never rewritten: curation only selects which immutable source records appear.
 */
export const publicationCatalog: PublicationCatalog = {
  ...sourcePublicationCatalog,
  counts: {
    ...sourcePublicationCatalog.counts,
    canonical_works: visibleWorks.length,
    openalex_indexed: visibleWorks.filter((work) => work.openalex_id != null).length,
    scholar_only: visibleWorks.filter((work) => work.openalex_id == null).length,
    by_display_type: visibleCountsByType,
  },
  works: visibleWorks,
};

export const isPrimaryPublication = (work: PublicationRecord) =>
  work.display_type === 'journal-article' || work.display_type === 'review';

export const publicationGroup = (work: PublicationRecord) => {
  if (isPrimaryPublication(work)) return 'articles';
  if (work.display_type === 'conference-abstract') return 'abstracts';
  return 'other';
};

export const publicationId = (work: PublicationRecord, index: number) => {
  const openAlexId = work.openalex_id?.split('/').pop();
  return openAlexId ? `pub-${openAlexId.toLowerCase()}` : `pub-scholar-${index + 1}`;
};

export const preferredPublicationUrl = (work: PublicationRecord) => {
  if (work.doi) return `https://doi.org/${work.doi}`;
  return work.openalex_id ?? work.scholar_detail_url;
};

const chronologicalPublicationOrder = (first: PublicationRecord, second: PublicationRecord) =>
  second.display_year_recommended - first.display_year_recommended
  || second.publication_date.localeCompare(first.publication_date)
  || second.scholar_citations - first.scholar_citations
  || first.title.localeCompare(second.title);

export const sortPublicationsByCuration = (works: readonly PublicationRecord[]) => [...works].sort((first, second) =>
  publicationFeaturedOrderByIdentity(identityForWork(first)) - publicationFeaturedOrderByIdentity(identityForWork(second))
  || chronologicalPublicationOrder(first, second)
);

export const featuredPublicationWorks = (limit: number = publicationCuration.maximumFeatured) =>
  sortPublicationsByCuration(publicationCatalog.works.filter((work) =>
    isPublicationFeaturedByIdentity(identityForWork(work)),
  )).slice(0, Math.min(limit, publicationCuration.maximumFeatured));

export const localizedPublicationNote = (work: PublicationRecord, locale: 'es' | 'en') =>
  getPublicationOverride(work)?.note[locale]?.trim() ?? '';

export const inferPublicationCluster = (work: PublicationRecord): PublicationCluster => {
  const title = work.title.toLocaleLowerCase('en');
  if (/astrocy|glial|microgl|neurogl|pannexin/.test(title)) return 'neuroglia';
  if (/carotid|chemoreceptor|chemoreflex|chemosens|tractus solitarii|\bnts\b/.test(title)) return 'chemoreception';
  if (/breath|respirat|retrotrapezoid|ventrolateral|\brvlm\b|\bc1 neuron/.test(title)) return 'breathing';
  if (/heart failure|cardiac|cardiorespir|sympath|blood pressure|hypertension/.test(title)) return 'cardiovascular';
  return 'cellular';
};

export const bibtexKey = (work: PublicationRecord, index: number) => {
  const surname = work.authors[0]?.split(/\s+/).at(-1)?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '') || 'DiazJara';
  const keyword = work.title.split(/\s+/).find((word) => word.length > 5)?.replace(/[^a-zA-Z]/g, '') || 'Work';
  return `${surname}${work.display_year_recommended}${keyword}${index + 1}`;
};

const bibEscape = (value: string | null | undefined) => [...String(value ?? '')]
  .map((character) => ({
    '\\': '\\textbackslash{}',
    '{': '\\{',
    '}': '\\}',
    '&': '\\&',
  })[character] ?? character)
  .join('');

export const catalogAsBibtex = () => publicationCatalog.works.map((work, index) => {
  const type = work.display_type === 'doctoral-thesis'
    ? 'phdthesis'
    : work.display_type === 'conference-proceedings-chapter'
      ? 'inproceedings'
      : 'article';
  const venueField = type === 'phdthesis'
    ? `  school = {${bibEscape(work.journal_or_source)}}`
    : type === 'inproceedings'
      ? `  booktitle = {${bibEscape(work.journal_or_source)}}`
      : `  journal = {${bibEscape(work.journal_or_source)}}`;
  const fields = [
    `  title = {${bibEscape(work.title)}}`,
    `  author = {${work.authors.map(bibEscape).join(' and ')}}`,
    `  year = {${work.display_year_recommended}}`,
    venueField,
    work.doi ? `  doi = {${work.doi}}` : null,
    `  url = {${preferredPublicationUrl(work)}}`,
  ].filter(Boolean);
  return `@${type}{${bibtexKey(work, index)},\n${fields.join(',\n')}\n}`;
}).join('\n\n');
