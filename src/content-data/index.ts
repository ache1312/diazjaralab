import { enContent } from "./en";
import { esContent } from "./es";
import { getCmsContent } from "../lib/cms/content";
import {
  locales,
  pageIds,
  type Locale,
  type PageId,
  type SiteContent,
} from "./types";

export * from "./types";
export { enContent } from "./en";
export { esContent } from "./es";

export const defaultLocale: Locale = "es";

export const contentByLocale = {
  es: esContent,
  en: enContent,
} as const satisfies Readonly<Record<Locale, SiteContent>>;

export const routesByLocale = {
  es: esContent.routes,
  en: enContent.routes,
} as const satisfies Readonly<Record<Locale, Readonly<Record<PageId, string>>>>;

export const allLocalizedRoutes = locales.flatMap((locale) =>
  pageIds.map((page) => ({
    locale,
    page,
    href: routesByLocale[locale][page],
  })),
);

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export function getContent(locale: Locale): SiteContent {
  return getCmsContent(locale);
}

export function getRoute(page: PageId, locale: Locale): string {
  return routesByLocale[locale][page];
}

export function getAlternateLocale(locale: Locale): Locale {
  return locale === "es" ? "en" : "es";
}

export function getAlternateRoute(page: PageId, locale: Locale): string {
  return getRoute(page, getAlternateLocale(locale));
}

export function getPageFromPath(
  pathname: string,
): { readonly locale: Locale; readonly page: PageId } | null {
  const normalizedPath = normalizePath(pathname);
  const match = allLocalizedRoutes.find(
    ({ href }) => normalizePath(href) === normalizedPath,
  );

  return match ? { locale: match.locale, page: match.page } : null;
}

function normalizePath(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || "/";
  return pathOnly === "/" ? pathOnly : `/${pathOnly.replace(/^\/+|\/+$/g, "")}/`;
}
