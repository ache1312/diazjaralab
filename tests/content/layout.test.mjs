import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let server;
let cms;
let layout;

before(async () => {
  server = await createServer({ appType: "custom", server: { middlewareMode: true } });
  [cms, layout] = await Promise.all([
    server.ssrLoadModule("/src/lib/cms/content.ts"),
    server.ssrLoadModule("/src/lib/cms/layout.ts"),
  ]);
});

after(async () => {
  await server?.close();
});

test("la posición del arreglo editorial controla el orden visual de los bloques", () => {
  const content = cms.getCmsContent("es");
  assert.equal(layout.blockAttributes(content, "home", "hero", 99).style, "order: 1");
  assert.equal(layout.blockAttributes(content, "home", "researchPreview", 99).style, "order: 3");

  const edited = {
    ...content,
    _tina: {
      page: {
        blocks: [
          { id: "home-join", type: "callToAction", enabled: true, locked: false, order: 9, variant: "quiet" },
          { id: "home-hero", type: "hero", enabled: true, locked: true, order: 1, variant: "immersive" },
          { id: "home-research", type: "researchPreview", enabled: false, locked: false, order: 3, variant: "chapters" },
        ],
      },
    },
  };
  assert.equal(layout.blockAttributes(edited, "home", "hero", 99).style, "order: 2");
  assert.equal(layout.blockAttributes(edited, "home", "researchPreview", 99).hidden, true);
  assert.equal(layout.blockAttributes(edited, "home", "publicEntry", 99).hidden, true);
});

test("un bloque estructural permanece visible aunque un archivo manipulado intente ocultarlo", () => {
  const content = cms.getCmsContent("en");
  const edited = {
    ...content,
    _tina: {
      page: {
        blocks: [
          { id: "home-hero", type: "hero", enabled: false, locked: true, order: 1, variant: "immersive" },
        ],
      },
    },
  };
  assert.equal(layout.blockAttributes(edited, "home", "hero", 1).hidden, undefined);
});

test("normaliza los nombres internos que Tina entrega al editor visual", () => {
  const content = cms.getCmsContent("es");
  const blocks = cms.getPageDocument("philosophy").blocks.map((block) => ({
    __typename: `PagesPhilosophyBlocks${block.type.charAt(0).toUpperCase()}${block.type.slice(1)}`,
    custom_id: block.id,
    enabled: block.enabled,
    locked: block.locked,
    order: block.order,
    variant: block.variant,
  }));
  const edited = { ...content, _tina: { page: { blocks } } };
  const hero = layout.blockAttributes(edited, "philosophy", "hero", 99);

  assert.equal(hero["data-cms-block"], "philosophy-hero");
  assert.equal(hero["data-cms-variant"], "editorial");
  assert.equal(hero.style, "order: 1");
  assert.equal(hero.hidden, undefined);
});
