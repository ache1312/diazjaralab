import { requestWithMetadata } from "@tinacms/astro";
import type { Locale, PageId, SiteContent } from "../../content-data/types";
import { getCmsContent } from "./content";

type EditableRecord = Record<string, any>;

function localized(source: EditableRecord | null | undefined, locale: Locale, fallback: string): string {
  const value = source?.[locale];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/**
 * Loads the page and global settings through Tina's local GraphQL server.
 * This module is imported only with STUDIO_MODE=true; the public build keeps
 * using the synchronous, static content loader.
 */
export async function getLiveCmsContent(locale: Locale, page: PageId): Promise<SiteContent> {
  const base = getCmsContent(locale);
  // Tina generates this client before it starts Astro. Keeping the import
  // request-scoped prevents the public/static build from depending on local
  // editor artifacts or their machine-specific cache paths.
  const generatedClientUrl = new URL("../../../tina/__generated__/client.ts", import.meta.url).href;
  const clientModule = await import(/* @vite-ignore */ generatedClientUrl);
  const client = clientModule.default as any;
  const [pageResult, settingsResult] = await Promise.all([
    requestWithMetadata(
      client.queries.pages({ relativePath: `${page}.json` }),
      { priority: "primary" },
    ),
    requestWithMetadata(client.queries.settings({ relativePath: "site.json" })),
  ]);

  const pageSource = (pageResult.data as EditableRecord | undefined)?.pages as EditableRecord | undefined;
  const settingsSource = (settingsResult.data as EditableRecord | undefined)?.settings as EditableRecord | undefined;
  const livePage = pageSource?.content?.[locale] as EditableRecord | undefined;
  const liveSeo = pageSource?.seo?.[locale] as EditableRecord | undefined;
  const next = {
    ...base,
    [page]: livePage ? { ...(base[page] as EditableRecord), ...livePage } : base[page],
    seo: {
      ...base.seo,
      [page]: liveSeo ? { ...base.seo[page], ...liveSeo } : base.seo[page],
    },
    _tina: { page: pageSource, settings: settingsSource },
  } as unknown as SiteContent;

  if (!settingsSource) return next;

  const brand = settingsSource.brand as EditableRecord | undefined;
  const navigation = settingsSource.navigation as EditableRecord | undefined;
  const common = settingsSource.common as EditableRecord | undefined;
  const footer = settingsSource.footer as EditableRecord | undefined;

  return {
    ...next,
    brand: {
      ...next.brand,
      name: localized(brand?.name, locale, next.brand.name),
      scientificName: localized(brand?.scientificName, locale, next.brand.scientificName),
      shortDescription: localized(brand?.shortDescription, locale, next.brand.shortDescription),
      logoAlt: localized(brand?.logoAlt, locale, next.brand.logoAlt),
      primaryLogo: brand?.primaryLogo || next.brand.primaryLogo,
      horizontalLogo: brand?.horizontalLogo || next.brand.horizontalLogo,
    },
    navigation: {
      ...next.navigation,
      ariaLabel: localized(navigation?.ariaLabel, locale, next.navigation.ariaLabel),
      openMenuLabel: localized(navigation?.openMenuLabel, locale, next.navigation.openMenuLabel),
      closeMenuLabel: localized(navigation?.closeMenuLabel, locale, next.navigation.closeMenuLabel),
      laboratoryMenuLabel: localized(navigation?.laboratoryMenuLabel, locale, next.navigation.laboratoryMenuLabel),
      languageSwitcherLabel: localized(navigation?.languageSwitcherLabel, locale, next.navigation.languageSwitcherLabel),
      items: Array.isArray(navigation?.items)
        ? navigation.items.filter(Boolean).map((item: EditableRecord, index: number) => ({
            ...next.navigation.items[index],
            page: item.page,
            menu: item.menu,
            label: localized(item.label, locale, next.navigation.items[index]?.label ?? item.page),
          }))
        : next.navigation.items,
    },
    common: {
      ...next.common,
      skipToContent: localized(common?.skipToContent, locale, next.common.skipToContent),
      readMore: localized(common?.readMore, locale, next.common.readMore),
      learnMore: localized(common?.learnMore, locale, next.common.learnMore),
      backToHome: localized(common?.backToHome, locale, next.common.backToHome),
      stateLabels: {
        published: localized(common?.stateLabels?.published, locale, next.common.stateLabels.published),
        forthcoming: localized(common?.stateLabels?.forthcoming, locale, next.common.stateLabels.forthcoming),
      },
    },
    footer: {
      description: localized(footer?.description, locale, next.footer.description),
      navigationLabel: localized(footer?.navigationLabel, locale, next.footer.navigationLabel),
      contactLabel: localized(footer?.contactLabel, locale, next.footer.contactLabel),
      location: localized(footer?.location, locale, next.footer.location),
      affiliation: localized(footer?.affiliation, locale, next.footer.affiliation),
      copyright: localized(footer?.copyright, locale, next.footer.copyright),
    },
  };
}
