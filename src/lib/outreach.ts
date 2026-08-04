import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '@/content-data';

export type OutreachEntry = CollectionEntry<'outreachEntries'>;

export type PublishedOutreachEntry = OutreachEntry & {
  data: OutreachEntry['data'] & {
    state: 'published';
    publishedAt: Date;
  };
};

export function outreachEntryPath(locale: Locale, slug: string): string {
  return locale === 'es'
    ? `/divulgacion/${slug}/`
    : `/en/outreach/${slug}/`;
}

export async function getPublishedOutreachEntries(
  locale?: Locale,
): Promise<PublishedOutreachEntry[]> {
  const entries = await getCollection(
    'outreachEntries',
    ({ data }) =>
      data.state === 'published' &&
      data.publishedAt instanceof Date &&
      (locale === undefined || data.locale === locale),
  );

  return (entries as PublishedOutreachEntry[]).sort((left, right) => {
    if (left.data.featured !== right.data.featured) {
      return left.data.featured ? -1 : 1;
    }

    return (
      right.data.publishedAt.getTime() - left.data.publishedAt.getTime() ||
      left.data.title.localeCompare(right.data.title)
    );
  });
}

export function findPublishedTranslation(
  entry: PublishedOutreachEntry,
  entries: readonly PublishedOutreachEntry[],
): PublishedOutreachEntry | undefined {
  return entries.find(
    (candidate) =>
      candidate.data.translationKey === entry.data.translationKey &&
      candidate.data.locale !== entry.data.locale,
  );
}
