import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

let server;
let cms;
let validation;

before(async () => {
  server = await createServer({
    appType: "custom",
    server: { middlewareMode: true },
  });
  [cms, validation] = await Promise.all([
    server.ssrLoadModule("/src/lib/cms/content.ts"),
    server.ssrLoadModule("/src/lib/cms/validation.ts"),
  ]);
});

after(async () => {
  await server?.close();
});

test("reconstruye SiteContent desde los documentos editables, sin snapshots rígidos", () => {
  const settings = cms.getSiteSettings();
  const home = cms.getPageDocument("home");
  for (const locale of ["es", "en"]) {
    const content = cms.getCmsContent(locale);
    assert.equal(content.locale, locale);
    assert.equal(content.brand.name, settings.brand.name[locale]);
    assert.equal(content.home.title, home.content[locale].title);
    assert.equal(content.seo.home.title, home.seo[locale].title);
    assert.equal(content.routes.home, settings.routes.home[locale]);
    assert.notStrictEqual(cms.getCmsContent(locale), content);
  }
});

test("valida la configuración editorial completa", () => {
  const result = cms.validateCmsWorkspace();
  assert.equal(result.valid, true);
  assert.equal(
    result.issues.filter(({ severity }) => severity === "error").length,
    0,
  );
});

test("protege cuatro tópicos y un máximo de cinco publicaciones destacadas", () => {
  const curation = cms.getPublicationCuration();
  assert.equal(curation.topics.length, 4);
  assert.equal(new Set(curation.topics.map(({ id }) => id)).size, 4);
  assert.ok(
    curation.overrides.filter(({ featured }) => featured).length <=
      curation.maximumFeatured,
  );

  const invalid = structuredClone(curation);
  invalid.overrides[0].publicationId = "W999999999999999999";
  const result = validation.validatePublicationCuration(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(({ path }) => path.endsWith("publicationId")));
});

test("descubre entidades por glob, sin una allowlist de registros", async () => {
  const translations = {
    es: { name: "Registro creado desde el CMS" },
    en: { name: "Record created in the CMS" },
  };
  const documents = cms.collectEntityDocuments({
    "/virtual/entities/people/zeta.json": { id: "zeta", order: 20, translations },
    "/virtual/entities/people/created-in-cms.json": { order: 10, translations },
  });

  assert.deepEqual(documents.map(({ id }) => id), ["created-in-cms", "zeta"]);
  assert.equal(documents[0].id, "created-in-cms", "el ID nuevo se deriva del archivo creado por Tina");

  const source = await readFile(new URL("../../src/lib/cms/content.ts", import.meta.url), "utf8");
  assert.match(source, /import\.meta\.glob\([^)]*content\/entities\/people\/\*\.json/su);
  assert.doesNotMatch(source, /from ["'][^"']*content\/entities\/people\/(?!\*)[^"']+\.json["']/u);
});

test("mantiene el orden editorial existente sin filtrarlo al contenido público", () => {
  const content = cms.getCmsContent("es");

  assert.deepEqual(
    content.research.areas.map(({ id }) => id),
    ["brainstem-circuits", "respiratory-neurodynamics", "disease-neurophysiology"],
  );
  assert.deepEqual(
    content.techniques.stages.map(({ id }) => id),
    ["manipulate", "measure", "visualize", "analyze"],
  );
  assert.ok(content.techniques.stages.every(({ question }) => question?.trim()), "cada etapa declara la pregunta que puede responder");
  assert.ok(
    content.techniques.stages.every(({ items }) => items.every((item) => item.label?.trim() && item.kind?.trim())),
    "cada capacidad distingue nombre y tipo metodológico",
  );
  assert.equal(
    content.team.members.find(({ id }) => id === "esteban-diaz-jara")?.group,
    "principal-investigator",
    "las referencias CMS a grupos se normalizan al ID usado por la interfaz",
  );
  assert.equal(
    content.team.members.find(({ id }) => id === "esteban-diaz-jara")?.portraitMedia,
    "content/media/team-esteban-diaz-jara.json",
    "cada integrante puede seleccionar su propio retrato registrado",
  );
  assert.equal(
    content.research.areas[0]?.imageMedia,
    "content/media/science-rvlm-astrocytes.json",
    "cada línea puede seleccionar su propia imagen científica registrada",
  );
  assert.equal("order" in content.team.members[0], false);
});
