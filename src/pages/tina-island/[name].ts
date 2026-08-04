import { experimental_createIslandRoute } from '@tinacms/astro/experimental';
import EditablePageBody from '@/components/studio/EditablePageBody.astro';
import { pageIds, type Locale, type PageId } from '@/content-data';
import { getLiveCmsContent } from '@/lib/cms/tina-live';

export const prerender = process.env.STUDIO_MODE !== 'true';

export function getStaticPaths() {
  return [];
}

const locales = new Set<Locale>(['es', 'en']);
const pages = new Set<PageId>(pageIds);

const pageIsland = experimental_createIslandRoute({
  page: {
    fetch: async (_request, params) => {
      const locale = params.get('locale') as Locale;
      const page = params.get('page') as PageId;
      if (!locales.has(locale) || !pages.has(page)) {
        throw new Error('Parámetros de edición inválidos.');
      }
      return { locale, page, content: await getLiveCmsContent(locale, page) };
    },
    component: EditablePageBody,
    wrapper: { tag: 'div', className: 'studio-page-island' },
    propsFromData: (data) => data as Record<string, unknown>,
  },
});

export const POST = pageIsland;
