#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_SITE = "https://diazjaralab.com";

const routePairs = [
  ["/", "/en/"],
  ["/investigacion/", "/en/research/"],
  ["/tecnicas/", "/en/techniques/"],
  ["/equipo/", "/en/team/"],
  ["/publicaciones/", "/en/publications/"],
  ["/filosofia/", "/en/philosophy/"],
  ["/divulgacion/", "/en/outreach/"],
  ["/contacto/", "/en/contact/"],
];

const requiredRoutes = routePairs.flat();
const expectedAlternates = new Map(
  routePairs.flatMap(([es, en]) => [
    [es, { es, en }],
    [en, { es, en }],
  ]),
);

const errors = [];
const checkedFiles = new Set();

function fail(scope, message) {
  errors.push(`${scope}: ${message}`);
}

function normalizeSite(rawSite) {
  let url;
  try {
    url = new URL(rawSite);
  } catch {
    throw new Error(`Invalid site URL: ${rawSite}`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`Site URL must use HTTPS: ${rawSite}`);
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function canonicalUrl(site, route) {
  return new URL(route, site.origin).href;
}

function routeToHtml(buildDir, route) {
  if (route === "/") return path.join(buildDir, "index.html");
  return path.join(buildDir, route.replace(/^\/+|\/+$/g, ""), "index.html");
}

function htmlFileToRoute(buildDir, file) {
  const relative = path.relative(buildDir, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative}`;
}

function parseAttributes(tag) {
  const attributes = new Map();
  const source = tag.replace(/^<\/?[^\s>]+|\/?\s*>$/g, "");
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = pattern.exec(source))) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }

  return attributes;
}

function tags(html, name) {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

function metaContents(html, keyAttribute, keyValue) {
  return tags(html, "meta")
    .map((tag) => parseAttributes(tag))
    .filter((attributes) => (attributes.get(keyAttribute) ?? "").toLowerCase() === keyValue.toLowerCase())
    .map((attributes) => attributes.get("content") ?? "");
}

function normalizeComparableUrl(raw, base) {
  try {
    const url = new URL(raw, base);
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function checkUnresolvedPlaceholders(scope, html) {
  const text = visibleText(html);
  const checks = [
    [/\blorem ipsum\b/i, "contains lorem ipsum"],
    [/\b(?:TODO|FIXME|TBD)\b/, "contains an editorial TODO/FIXME/TBD marker"],
    [/\{\{[^{}]+\}\}/, "contains an unresolved {{ template token }}"],
    [/\$\{[^{}]+\}/, "contains an unresolved ${template token}"],
    [/\[%(?:.|\n)*?%\]/, "contains an unresolved template token"],
    [/\b(?:localhost|127\.0\.0\.1)(?::\d+)?\b/i, "contains a development-only host"],
  ];

  for (const [pattern, message] of checks) {
    if (pattern.test(text)) fail(scope, message);
  }

  if (/\b(?:href|src|action|poster)\s*=\s*["']\s*#["']/i.test(html)) {
    fail(scope, "contains a dead href/src/action/poster=\"#\" placeholder");
  }

  if (/\b(?:href|src|action|poster)\s*=\s*["'][^"']*(?:undefined|null|\[object Object\]|REPLACE_ME)[^"']*["']/i.test(html)) {
    fail(scope, "contains an unresolved value in a URL-bearing attribute");
  }

  if (/https?:\/\/(?:www\.)?example\.(?:com|org|net)\b/i.test(html)) {
    fail(scope, "contains an example.com/org/net placeholder URL");
  }
}

function getDocumentIds(html) {
  const ids = new Set();
  const duplicates = new Set();

  for (const tag of html.match(/<[a-z][^>]*\bid\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/gi) ?? []) {
    const id = parseAttributes(tag).get("id");
    if (!id) continue;
    if (ids.has(id)) duplicates.add(id);
    ids.add(id);
  }

  return { ids, duplicates };
}

function collectHtmlReferences(html) {
  const references = [];
  const tagPattern = /<(?:a|area|audio|embed|form|iframe|img|input|link|object|script|source|track|video)\b[^>]*>/gi;
  const attributeNames = ["href", "src", "action", "poster", "data"];

  for (const tag of html.match(tagPattern) ?? []) {
    const attributes = parseAttributes(tag);
    for (const name of attributeNames) {
      if (attributes.has(name)) references.push({ name, value: attributes.get(name), tag });
    }

    for (const name of ["srcset", "imagesrcset"]) {
      const srcset = attributes.get(name);
      if (!srcset) continue;
      for (const candidate of srcset.split(",")) {
        const value = candidate.trim().split(/\s+/)[0];
        if (value) references.push({ name, value, tag });
      }
    }
  }

  return references;
}

function shouldIgnoreReference(raw) {
  return (
    !raw ||
    raw.startsWith("#") ||
    /^(?:mailto|tel|sms|data|blob|javascript):/i.test(raw) ||
    raw.includes("{") ||
    raw.includes("}")
  );
}

function safeDecodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function findInternalTarget(buildDir, pathname) {
  const decoded = safeDecodePathname(pathname);
  const relative = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(buildDir, relative);
  const buildRoot = `${path.resolve(buildDir)}${path.sep}`;

  if (resolved !== path.resolve(buildDir) && !resolved.startsWith(buildRoot)) return null;

  const candidates = [];
  if (decoded.endsWith("/")) {
    candidates.push(path.join(resolved, "index.html"));
  } else if (path.extname(decoded)) {
    candidates.push(resolved);
  } else {
    candidates.push(resolved, `${resolved}.html`, path.join(resolved, "index.html"));
  }

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function walkFiles(dir) {
  const output = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...(await walkFiles(absolute)));
    else if (entry.isFile()) output.push(absolute);
  }
  return output;
}

async function checkCssAssets(buildDir, cssFile, site) {
  const css = await readFile(cssFile, "utf8");
  const cssPublicUrl = new URL(`/${path.relative(buildDir, cssFile).split(path.sep).join("/")}`, site);
  const pattern = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi;
  let match;

  while ((match = pattern.exec(css))) {
    const raw = match[1] ?? match[2] ?? match[3];
    if (shouldIgnoreReference(raw)) continue;
    let target;
    try {
      target = new URL(raw, cssPublicUrl);
    } catch {
      fail(path.relative(buildDir, cssFile), `invalid CSS asset URL \"${raw}\"`);
      continue;
    }
    if (target.origin !== site.origin) continue;
    if (!(await findInternalTarget(buildDir, target.pathname))) {
      fail(path.relative(buildDir, cssFile), `missing CSS asset \"${raw}\"`);
    }
  }
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");
  const buildDir = path.resolve(projectRoot, process.argv[2] ?? "dist");
  const site = normalizeSite(process.env.SITE_URL ?? DEFAULT_SITE);

  if (!(await exists(buildDir))) {
    throw new Error(`Build directory does not exist: ${buildDir}. Run the production build first.`);
  }

  const htmlByRoute = new Map();

  for (const route of requiredRoutes) {
    const file = routeToHtml(buildDir, route);
    if (!(await exists(file))) {
      fail(route, `missing built route (${path.relative(projectRoot, file)})`);
      continue;
    }
    htmlByRoute.set(route, await readFile(file, "utf8"));
  }

  if (!(await exists(path.join(buildDir, "404.html")))) {
    fail("/404.html", "missing bilingual custom 404 page");
  }

  const canonicalOwners = new Map();

  for (const route of requiredRoutes) {
    const html = htmlByRoute.get(route);
    if (!html) continue;
    const scope = route;
    const documentUrl = canonicalUrl(site, route);
    const expectedLang = route.startsWith("/en/") ? "en" : "es";
    const htmlTag = html.match(/<html\b[^>]*>/i)?.[0];
    const lang = htmlTag ? parseAttributes(htmlTag).get("lang") : null;

    if (!lang || lang.toLowerCase().split("-")[0] !== expectedLang) {
      fail(scope, `expected <html lang=\"${expectedLang}\">, found ${lang ? `\"${lang}\"` : "none"}`);
    }

    const linkTags = tags(html, "link").map((tag) => ({ tag, attrs: parseAttributes(tag) }));
    const canonicalTags = linkTags.filter(({ attrs }) =>
      (attrs.get("rel") ?? "").toLowerCase().split(/\s+/).includes("canonical"),
    );

    if (canonicalTags.length !== 1) {
      fail(scope, `expected exactly one canonical link, found ${canonicalTags.length}`);
    } else {
      const rawCanonical = canonicalTags[0].attrs.get("href");
      const actualCanonical = normalizeComparableUrl(rawCanonical, documentUrl);
      const expectedCanonical = normalizeComparableUrl(documentUrl, documentUrl);
      if (actualCanonical !== expectedCanonical) {
        fail(scope, `canonical must be ${expectedCanonical}, found ${rawCanonical || "an empty value"}`);
      } else if (canonicalOwners.has(actualCanonical)) {
        fail(scope, `canonical duplicates ${canonicalOwners.get(actualCanonical)}`);
      } else {
        canonicalOwners.set(actualCanonical, scope);
      }
    }

    const alternates = new Map();
    for (const { attrs } of linkTags) {
      const rels = (attrs.get("rel") ?? "").toLowerCase().split(/\s+/);
      const hreflang = attrs.get("hreflang")?.toLowerCase();
      if (!rels.includes("alternate") || !hreflang) continue;
      if (alternates.has(hreflang)) fail(scope, `duplicate hreflang=\"${hreflang}\"`);
      alternates.set(hreflang, attrs.get("href"));
    }

    const pair = expectedAlternates.get(route);
    for (const locale of ["es", "en"]) {
      const rawAlternate = alternates.get(locale);
      const expected = canonicalUrl(site, pair[locale]);
      const actual = rawAlternate ? normalizeComparableUrl(rawAlternate, documentUrl) : null;
      if (actual !== expected) {
        fail(scope, `hreflang=\"${locale}\" must point to ${expected}, found ${rawAlternate ?? "none"}`);
      }
    }
    if (alternates.has("x-default")) {
      const actual = normalizeComparableUrl(alternates.get("x-default"), documentUrl);
      const expected = canonicalUrl(site, pair.es);
      if (actual !== expected) fail(scope, `hreflang=\"x-default\" must point to ${expected}`);
    }

    const expectedSocialImage = canonicalUrl(site, `/brand/og-default-dark-${expectedLang}-v2.png`);
    const requiredSocialMeta = [
      ["property", "og:image", expectedSocialImage],
      ["property", "og:image:secure_url", expectedSocialImage],
      ["property", "og:image:type", "image/png"],
      ["property", "og:image:width", "1200"],
      ["property", "og:image:height", "630"],
      ["name", "twitter:card", "summary_large_image"],
      ["name", "twitter:image", expectedSocialImage],
    ];
    for (const [keyAttribute, keyValue, expectedContent] of requiredSocialMeta) {
      const values = metaContents(html, keyAttribute, keyValue);
      if (values.length !== 1 || values[0] !== expectedContent) {
        fail(scope, `${keyValue} must be ${expectedContent}, found ${values.length === 1 ? values[0] : values.length}`);
      }
    }

    for (const [keyAttribute, keyValue] of [["property", "og:image:alt"], ["name", "twitter:image:alt"]]) {
      const values = metaContents(html, keyAttribute, keyValue);
      if (values.length !== 1 || !values[0].trim()) fail(scope, `${keyValue} must contain localized alternative text`);
    }

    const socialImageFile = await findInternalTarget(buildDir, new URL(expectedSocialImage).pathname);
    if (!socialImageFile) fail(scope, `missing social image ${expectedSocialImage}`);
    else checkedFiles.add(socialImageFile);

    const { duplicates } = getDocumentIds(html);
    for (const id of duplicates) fail(scope, `duplicate id=\"${id}\"`);
  }

  const allFiles = await walkFiles(buildDir);
  const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
  const htmlCache = new Map();

  const editorArtifactPatterns = [
    [/data-tina-field/i, "contains Tina field metadata"],
    [/data-studio-ui/i, "contains the local studio toolbar"],
    [/\/(?:api\/session|tina-island)\b/i, "contains a local editor endpoint"],
    [/(?:127\.0\.0\.1:4322|localhost:4001)/i, "contains a local editor service address"],
  ];
  for (const file of allFiles.filter((candidate) => /\.(?:html|css|js|mjs|json|map)$/i.test(candidate))) {
    const relative = path.relative(buildDir, file).split(path.sep).join("/");
    if (/(?:^|\/)(?:admin|studio|tina-island)(?:\/|$)|StudioToolbar/i.test(relative)) {
      fail(relative, "local editor artifact was emitted in the public build");
      continue;
    }
    const source = await readFile(file, "utf8");
    for (const [pattern, message] of editorArtifactPatterns) {
      if (pattern.test(source)) fail(relative, message);
    }
  }

  for (const file of htmlFiles) {
    const route = htmlFileToRoute(buildDir, file);
    const html = htmlByRoute.get(route) ?? (await readFile(file, "utf8"));
    htmlCache.set(file, html);
    checkUnresolvedPlaceholders(route, html);

    const pageUrl = canonicalUrl(site, route);
    for (const { name, value: raw } of collectHtmlReferences(html)) {
      if (shouldIgnoreReference(raw)) continue;
      let target;
      try {
        target = new URL(raw, pageUrl);
      } catch {
        fail(route, `invalid ${name} URL \"${raw}\"`);
        continue;
      }
      if (target.origin !== site.origin) continue;

      const targetFile = await findInternalTarget(buildDir, target.pathname);
      if (!targetFile) {
        fail(route, `missing internal target \"${raw}\"`);
        continue;
      }
      checkedFiles.add(targetFile);

      if (target.hash && targetFile.endsWith(".html")) {
        const targetHtml = htmlCache.get(targetFile) ?? (await readFile(targetFile, "utf8"));
        htmlCache.set(targetFile, targetHtml);
        const id = safeDecodePathname(target.hash.slice(1));
        if (!getDocumentIds(targetHtml).ids.has(id)) {
          fail(route, `fragment \"${raw}\" does not match an id in the target page`);
        }
      }
    }
  }

  for (const cssFile of allFiles.filter((file) => file.endsWith(".css"))) {
    await checkCssAssets(buildDir, cssFile, site);
  }

  if (errors.length) {
    console.error(`\nBuild validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:`);
    for (const message of errors) console.error(`  - ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Build validation passed: ${requiredRoutes.length} localized routes, ${htmlFiles.length} HTML files, ` +
      `${checkedFiles.size} internal targets, canonical/hreflang and localized social metadata, and placeholder checks.`,
  );
}

main().catch((error) => {
  console.error(`Build validation could not run: ${error.message}`);
  process.exitCode = 1;
});
