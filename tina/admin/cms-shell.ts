import type { TinaCMS } from "tinacms";

const STUDIO_STYLESHEET_ID = "diaz-jara-studio-theme";
const STUDIO_STYLESHEET_URL = "/studio/tina-admin.css?v=20260803-7";

const PAGE_LABELS: Record<string, string> = {
  contact: "Contacto",
  home: "Inicio",
  outreach: "Divulgación",
  philosophy: "Cómo trabajamos",
  publications: "Publicaciones",
  research: "Investigación",
  team: "Equipo",
  techniques: "Técnicas",
};

const PAGE_KEY_BY_ROUTE: Record<string, string> = {
  contacto: "contact",
  divulgacion: "outreach",
  equipo: "team",
  filosofia: "philosophy",
  investigacion: "research",
  publicaciones: "publications",
  tecnicas: "techniques",
};

const INTERFACE_TRANSLATIONS = new Map<string, string>([
  ["Collections", "Editar contenido"],
  ["Contenido editable", "Editar contenido"],
  ["Site", "Configuración"],
  ["Dashboard", "Herramientas"],
  ["Media Manager", "Biblioteca de medios"],
  ["Media Usage", "Uso de medios"],
  ["Log Out", "Salir del editor"],
  ["Referenced Files", "Opciones relacionadas"],
  ["Archivos relacionados", "Opciones relacionadas"],
  ["Reset", "Descartar"],
  ["Are you sure you want to reset all changes?", "\u00bfQuieres descartar todos los cambios sin guardar?"],
  ["Cancel", "Cancelar"],
  ["Save", "Guardar"],
  ["Saving...", "Guardando…"],
  ["You are in local mode", "Edición local"],
  ["Enter into edit mode", "Editor de contenidos"],
  ["Enter Edit Mode", "Comenzar a editar"],
  ["When you save, changes will be saved to the local filesystem.", "Los cambios se guardan en los archivos locales del sitio."],
  ["TinaCMS form fields will appear here.", "Selecciona un texto o una sección de la vista previa para editarla."],
  ["Visual Editing Docs", "Guía de edición visual"],
  ["Add", "Agregar"],
  ["Delete", "Eliminar"],
  ["Duplicate", "Duplicar"],
  ["Search", "Buscar"],
]);

const NAVIGATION_ORDER = [
  "pages",
  "outreachEntries",
  "publicationCuration",
  "people",
  "researchAreas",
  "techniqueStages",
  "grants",
  "teamGroups",
  "values",
  "media",
] as const;

interface PageFieldSection {
  label: string;
  field?: string;
  button?: string;
}

const PAGE_FIELD_SECTIONS: Record<string, PageFieldSection[]> = {
  contact: [
    { label: "Portada", field: "eyebrow" },
    { label: "Dirección", field: "asideLabel" },
    { label: "Mapa", field: "mapEyebrow" },
    { label: "Contacto", field: "directEmailLabel" },
    { label: "Formulario", button: "Formulario" },
    { label: "Oportunidades", button: "Oportunidades" },
  ],
  home: [
    { label: "Portada", field: "eyebrow" },
    { label: "Sociedad", button: "Entrada para la sociedad" },
    { label: "Imágenes", button: "Registro científico de imágenes" },
    { label: "Investigación", field: "researchEyebrow" },
    { label: "Métodos", field: "pipelineEyebrow" },
    { label: "Financiamiento", field: "fundingEyebrow" },
    { label: "Publicaciones", field: "publicationsEyebrow" },
    { label: "Equipo", field: "teamEyebrow" },
    { label: "Cierre", field: "joinEyebrow" },
  ],
  outreach: [
    { label: "Portada", field: "eyebrow" },
    { label: "Estado", field: "status" },
    { label: "Archivo", button: "Archivo de divulgación" },
    { label: "Entradas", button: "Textos de las entradas" },
    { label: "Redes sociales", field: "instagramLabel" },
  ],
  philosophy: [
    { label: "Portada", field: "eyebrow" },
    { label: "Alcance", field: "asideLabel" },
    { label: "Criterio científico", field: "generalCriterionLabel" },
    { label: "Misión y visión", field: "missionLabel" },
    { label: "Valores", field: "valuesEyebrow" },
  ],
  publications: [
    { label: "Portada", field: "eyebrow" },
    { label: "Perfiles", field: "profilesTitle" },
    { label: "Grafo", button: "Red bibliográfica interactiva" },
    { label: "Catálogo", button: "Textos del catálogo y sus filtros" },
    { label: "Fuentes", button: "Procedencia y fuentes" },
  ],
  research: [
    { label: "Portada", field: "eyebrow" },
    { label: "Imágenes y alcance", button: "Imágenes y documentos" },
    { label: "Preguntas científicas", field: "asideLabel" },
    { label: "Financiamiento", field: "fundingEyebrow" },
  ],
  team: [
    { label: "Portada", field: "eyebrow" },
    { label: "Retratos", button: "Imágenes y documentos" },
    { label: "Presentación", field: "asideLabel" },
  ],
  techniques: [
    { label: "Portada", field: "eyebrow" },
    { label: "Proceso experimental", field: "railLabel" },
    { label: "Cierre", field: "closingEyebrow" },
  ],
};

type StudioWindow = Window & {
  __diazJaraStudioObserver?: MutationObserver;
  __diazJaraStudioSchedule?: () => void;
  __diazJaraAutoEntered?: boolean;
  __diazJaraPrimaryForm?: {
    route: string;
    stage: "content" | "contentPending" | "language" | "languagePending" | "done";
    attempts: number;
  };
  __diazJaraContentListener?: boolean;
};

const closestWithClass = (element: HTMLElement | null, className: string) => {
  let current: HTMLElement | null = element;
  while (current && !current.classList.contains(className)) current = current.parentElement;
  return current;
};

const mark = (element: Element | null | undefined, name: string) => {
  if (element instanceof HTMLElement) element.dataset[name] = "";
  return element instanceof HTMLElement ? element : null;
};

const createBrand = (location: "header" | "navigation") => {
  const brand = document.createElement("div");
  brand.dataset.djlStudioBrand = location;
  brand.setAttribute("aria-label", "Díaz-Jara Lab, editor de contenidos");

  const image = document.createElement("img");
  image.src = "/brand/mark.svg";
  image.alt = "";
  image.setAttribute("aria-hidden", "true");

  const copy = document.createElement("span");
  const name = document.createElement("strong");
  const purpose = document.createElement("small");
  name.textContent = "Díaz-Jara Lab";
  purpose.textContent = location === "header" ? "Editor de contenidos" : "Edición del sitio";
  copy.append(name, purpose);
  brand.append(image, copy);

  return brand;
};

const normalizedText = (value: string | null | undefined) =>
  (value || "").replace(/\s+/gu, " ").trim().toLocaleLowerCase("es");

const currentPageRoute = () => {
  const match = window.location.hash.match(/^#\/?~(?:\/([^/]+))?\/?$/u);
  if (!match) return null;
  const route = match[1];
  return route ? PAGE_KEY_BY_ROUTE[route] || route : "home";
};

const buttonIsDisabled = (button: HTMLButtonElement | null | undefined) => Boolean(
  !button
  || button.disabled
  || button.getAttribute("aria-disabled") === "true"
  || button.classList.contains("pointer-events-none")
  || button.classList.contains("cursor-not-allowed"),
);

const findButton = (root: ParentNode, labels: string[]) => {
  const expected = labels.map(normalizedText);
  return [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => {
    const text = normalizedText(button.textContent);
    return expected.some((label) => text === label || text.startsWith(label));
  });
};

const sectionTarget = (
  form: HTMLElement,
  prefix: string,
  section: PageFieldSection,
) => {
  if (section.field) {
    return form.querySelector<HTMLElement>(`[name="${prefix}.${section.field}"]`);
  }
  if (!section.button) return null;
  const label = normalizedText(section.button);
  return [...form.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
    normalizedText(button.textContent).startsWith(label),
  ) || null;
};

const enhanceFormGuide = (form: HTMLElement, page: string, prefix: string, language: string) => {
  const sections = PAGE_FIELD_SECTIONS[page];
  const formBody = form.firstElementChild;
  const existingGuide = form.querySelector<HTMLElement>("[data-djl-form-guide]");

  form.querySelectorAll<HTMLElement>("[data-djl-section-start]").forEach((element) => {
    delete element.dataset.djlSectionStart;
    delete element.dataset.djlSectionFirst;
  });
  if (!sections || !(formBody instanceof HTMLElement) || !form.querySelector(`[name="${prefix}.title"]`)) {
    existingGuide?.remove();
    return;
  }

  const availableSections = sections.flatMap((section, index) => {
    const target = sectionTarget(form, prefix, section);
    if (!target) return [];
    const wrapper = target.closest<HTMLElement>('[class~="mb-5"]') || target;
    wrapper.dataset.djlSectionStart = section.label;
    if (index === 0) wrapper.dataset.djlSectionFirst = "";
    return [{ ...section, target }];
  });
  if (availableSections.length < 2) return;

  let guide = existingGuide;
  if (!guide) {
    guide = document.createElement("nav");
    guide.dataset.djlFormGuide = "";
    guide.setAttribute("aria-label", "Secciones del formulario");
    const label = document.createElement("label");
    const caption = document.createElement("span");
    const select = document.createElement("select");
    const pageOptions = document.createElement("button");
    caption.textContent = "Ir a";
    select.setAttribute("aria-label", "Ir a una sección del contenido");
    label.append(caption, select);
    pageOptions.type = "button";
    pageOptions.dataset.djlPageOptions = "";
    pageOptions.textContent = "Orden y ajustes";
    pageOptions.addEventListener("click", () => {
      const route = currentPageRoute();
      const pageLabel = route ? PAGE_LABELS[route] : null;
      const pageButton = [...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="breadcrumb"] button')].find(
        (button) => normalizedText(button.textContent) === normalizedText(pageLabel),
      );
      pageButton?.click();
    });
    guide.append(label, pageOptions);
    formBody.prepend(guide);

    select.addEventListener("change", () => {
      const selected = PAGE_FIELD_SECTIONS[guide?.dataset.page || ""]?.find(
        (section) => section.label === select.value,
      );
      const activePrefix = guide?.dataset.prefix || "";
      const target = selected ? sectionTarget(form, activePrefix, selected) : null;
      if (target) {
        target.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
        window.setTimeout(() => target.focus({ preventScroll: true }), 180);
      }
      select.value = "";
    });
  }

  const guideChanged = guide.dataset.page !== page || guide.dataset.prefix !== prefix;
  guide.dataset.page = page;
  guide.dataset.prefix = prefix;
  const select = guide.querySelector<HTMLSelectElement>("select");
  const caption = guide.querySelector<HTMLElement>("label > span");
  const pageOptions = guide.querySelector<HTMLButtonElement>("[data-djl-page-options]");
  const captionText = `Contenido en ${language}`;
  if (caption && caption.textContent !== captionText) caption.textContent = captionText;
  if (pageOptions) {
    const route = currentPageRoute();
    const pageLabel = route ? PAGE_LABELS[route] : null;
    pageOptions.hidden = ![...document.querySelectorAll<HTMLButtonElement>('nav[aria-label="breadcrumb"] button')].some(
      (button) => normalizedText(button.textContent) === normalizedText(pageLabel),
    );
  }
  if (select && (guideChanged || select.options.length !== availableSections.length + 1)) {
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Ir a una sección…";
    select.append(placeholder);
    availableSections.forEach((section) => {
      const option = document.createElement("option");
      option.value = section.label;
      option.textContent = section.label;
      select.append(option);
    });
  }
};

const advancePrimaryForm = (force = false) => {
  const route = currentPageRoute();
  if (!route) return;
  const studioWindow = window as StudioWindow;
  if (force || studioWindow.__diazJaraPrimaryForm?.route !== route) {
    studioWindow.__diazJaraPrimaryForm = { route, stage: "content", attempts: 0 };
  }
  const state = studioWindow.__diazJaraPrimaryForm;
  if (!state || ["contentPending", "languagePending", "done"].includes(state.stage)) return;
  const formSelector = `[data-test="form:content/pages/${route}.json"]`;
  const activeForm = () => document.querySelector<HTMLElement>(formSelector);
  const form = activeForm();
  if (!form) return;

  if (form.querySelector(`[name^="content.es."]`)) {
    state.stage = "done";
    return;
  }
  if (state.stage === "content") {
    const contentButton = findButton(form, ["Contenido", "Texto de la página"]);
    if (contentButton && state.attempts < 4) {
      state.attempts += 1;
      state.stage = "contentPending";
      window.setTimeout(() => {
        if (studioWindow.__diazJaraPrimaryForm !== state || state.stage !== "contentPending") return;
        state.stage = "language";
        if (contentButton.isConnected) contentButton.click();
        window.setTimeout(() => {
          if (studioWindow.__diazJaraPrimaryForm !== state || state.stage !== "language") return;
          const currentForm = activeForm();
          if (
            currentForm
            && !findButton(currentForm, ["Español"])
            && findButton(currentForm, ["Contenido", "Texto de la página"])
          ) {
            state.stage = "content";
          }
          advancePrimaryForm();
        }, 180);
      }, 120);
      return;
    }
    if (findButton(form, ["Español"])) state.stage = "language";
  }
  const spanishButton = findButton(form, ["Español"]);
  if (spanishButton && state.attempts < 4) {
    state.attempts += 1;
    state.stage = "languagePending";
    window.setTimeout(() => {
      if (studioWindow.__diazJaraPrimaryForm !== state || state.stage !== "languagePending") return;
      state.stage = "done";
      if (spanishButton.isConnected) spanishButton.click();
      window.setTimeout(() => {
        if (
          studioWindow.__diazJaraPrimaryForm === state
          && state.stage === "done"
          && !activeForm()?.querySelector('[name^="content.es."]')
          && Boolean(activeForm() && findButton(activeForm() as HTMLElement, ["Español"]))
        ) {
          state.stage = "language";
          advancePrimaryForm();
        }
      }, 180);
    }, 120);
  }
};

const enterEditMode = () => {
  const studioWindow = window as StudioWindow;
  const button = document.querySelector<HTMLButtonElement>('button[data-test="enter-edit-mode"]');
  if (!button || studioWindow.__diazJaraAutoEntered) return;
  studioWindow.__diazJaraAutoEntered = true;
  button.click();
};

const openPrimaryContent = () => {
  const route = currentPageRoute();
  if (!route) return;
  const breadcrumb = document.querySelector<HTMLElement>('nav[aria-label="breadcrumb"]');
  const pageLabel = PAGE_LABELS[route];
  const pageButton = [...(breadcrumb?.querySelectorAll<HTMLButtonElement>("button") || [])].find(
    (button) => normalizedText(button.textContent) === normalizedText(pageLabel),
  );
  advancePrimaryForm(true);
  pageButton?.click();
};

const installStudioAssets = () => {
  document.documentElement.lang = "es";
  document.documentElement.dataset.djlStudio = "";
  document.body?.setAttribute("data-djl-studio", "");
  document.title = "Editor de contenidos · Díaz-Jara Lab";

  let stylesheet = document.getElementById(STUDIO_STYLESHEET_ID) as HTMLLinkElement | null;
  if (!stylesheet) {
    stylesheet = document.createElement("link");
    stylesheet.id = STUDIO_STYLESHEET_ID;
    stylesheet.rel = "stylesheet";
    document.head.append(stylesheet);
  }
  if (stylesheet.href !== new URL(STUDIO_STYLESHEET_URL, window.location.href).href) {
    stylesheet.href = STUDIO_STYLESHEET_URL;
  }

  let favicon = document.querySelector<HTMLLinkElement>('link[data-djl-studio-favicon]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.dataset.djlStudioFavicon = "";
    document.head.append(favicon);
  }
  favicon.href = "/brand/favicon.svg";
};

const enhanceSidebarHeader = () => {
  const hideButton = document.querySelector<HTMLButtonElement>(
    'button[data-djl-hide-panel], button[aria-label="Hide editing panel"]',
  );
  if (!hideButton) return;

  hideButton.dataset.djlHidePanel = "";
  hideButton.setAttribute("aria-label", "Ocultar panel de edición");
  hideButton.title = "Ocultar panel de edición";

  const shell = mark(hideButton.closest("div.fixed"), "djlStudioSidebar");
  const frame = mark(shell?.firstElementChild, "djlStudioFrame");
  const surface = frame
    ? [...frame.children].find((child) => child instanceof HTMLElement && child !== hideButton && child.classList.contains("w-full"))
    : null;
  mark(surface, "djlStudioSurface");

  const header = mark(closestWithClass(hideButton, "flex-grow-0"), "djlStudioHeader");
  const menuButton = header?.querySelector<HTMLButtonElement>(
    'button[data-djl-open-navigation], button[aria-label="Open navigation menu"]',
  );
  if (menuButton) {
    menuButton.dataset.djlOpenNavigation = "";
    menuButton.setAttribute("aria-label", "Abrir navegación editorial");
    menuButton.title = "Abrir navegación editorial";

    const lead = menuButton.parentElement;
    const vendorLogo = lead?.querySelector(":scope > svg");
    vendorLogo?.setAttribute("data-djl-vendor-logo", "");
    if (lead && !lead.querySelector('[data-djl-studio-brand="header"]')) {
      menuButton.after(createBrand("header"));
    }

    const localModeLink = lead?.querySelector<HTMLAnchorElement>('a[href*="what-is-tinacloud"]');
    if (localModeLink) {
      localModeLink.textContent = "Edición local";
      localModeLink.title = "Los cambios se guardan primero en este equipo";
      mark(localModeLink.parentElement, "djlLocalStatus");
    }
  }

  const showButton = document.querySelector<HTMLButtonElement>(
    'button[data-djl-show-panel], button[aria-label="Show editing panel"]',
  );
  if (showButton) {
    showButton.dataset.djlShowPanel = "";
    showButton.setAttribute("aria-label", "Mostrar panel de edición");
    showButton.title = "Mostrar panel de edición";
  }
};

const enhanceForm = () => {
  const form = mark(document.querySelector<HTMLElement>('[data-test^="form:"]'), "djlStudioForm");
  if (!form) return;

  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input[name], textarea[name], select[name]",
  ).forEach((control) => {
    if (!control.id) control.id = control.name;
  });

  const preview = document.querySelector<HTMLIFrameElement>("iframe");
  if (preview) preview.title = "Vista previa editable del sitio";

  const breadcrumb = document.querySelector<HTMLElement>('nav[aria-label="breadcrumb"]');
  mark(breadcrumb?.parentElement, "djlStudioBreadcrumb");

  breadcrumb?.querySelectorAll<HTMLElement>(
    '[data-slot="breadcrumb-link"], [data-slot="breadcrumb-page"]',
  ).forEach((item) => {
    const rawLabel = item.dataset.djlRawLabel || item.textContent?.trim() || "";
    item.dataset.djlRawLabel = rawLabel;
    if (PAGE_LABELS[rawLabel]) item.textContent = PAGE_LABELS[rawLabel];
  });

  const currentPage = breadcrumb?.querySelector<HTMLElement>('[data-slot="breadcrumb-page"]');
  const activePrefix = form.querySelector('[name^="content.es."]')
    ? "content.es"
    : form.querySelector('[name^="content.en."]')
      ? "content.en"
      : null;
  const activeLanguage = activePrefix === "content.es" ? "Español" : activePrefix === "content.en" ? "Inglés" : null;
  if (currentPage && activeLanguage && ["Contenido", "Texto de la página"].includes(currentPage.textContent?.trim() || "")) {
    currentPage.textContent = activeLanguage;
  }

  const page = form.dataset.test?.match(/content\/pages\/([^/]+)\.json$/u)?.[1];
  if (page) enhanceFormGuide(form, page, activePrefix || "", activeLanguage || "");

  const backButton = breadcrumb?.querySelector<HTMLButtonElement>('button[aria-label^="Back to"]');
  if (backButton) backButton.setAttribute("aria-label", "Volver a Páginas");

  const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")];
  const relatedFiles = buttons.find((button) =>
    ["Referenced Files", "Archivos relacionados", "Opciones relacionadas"].includes(button.textContent?.trim() || ""),
  );
  mark(relatedFiles, "djlRelatedFiles");

  const saveButton = buttons.find((button) => ["Save", "Guardar", "Saving...", "Guardando…"].includes(button.textContent?.trim() || ""));
  const actionBar = mark(saveButton?.parentElement, "djlActionBar");
  if (actionBar) {
    let saveState = actionBar.querySelector<HTMLElement>("[data-djl-save-state]");
    if (!saveState) {
      saveState = document.createElement("span");
      saveState.dataset.djlSaveState = "";
      saveState.setAttribute("role", "status");
      saveState.setAttribute("aria-live", "polite");
      actionBar.prepend(saveState);
    }
    const saving = ["saving...", "guardando…"].includes(normalizedText(saveButton?.textContent));
    const state = saving ? "saving" : buttonIsDisabled(saveButton) ? "saved" : "dirty";
    const stateLabel = state === "saving" ? "Guardando…" : state === "saved" ? "Sin cambios" : "Cambios sin guardar";
    saveState.dataset.state = state;
    if (saveState.textContent !== stateLabel) saveState.textContent = stateLabel;
    saveState.title = "Atajo para guardar: Ctrl o Comando + S";
  }
};

const enhanceNavigation = () => {
  const headings = [...document.querySelectorAll<HTMLHeadingElement>("h4")];
  const collectionsHeading = headings.find((heading) =>
    ["Collections", "Contenido editable", "Editar contenido"].includes(heading.textContent?.trim() || ""),
  );
  if (!collectionsHeading) return;

  let panel: HTMLElement | null = collectionsHeading.parentElement;
  while (panel && !(panel.classList.contains("z-30") && panel.classList.contains("flex-col"))) {
    panel = panel.parentElement;
  }
  if (!panel) return;

  mark(panel, "djlNavigationPanel");
  mark(panel.parentElement, "djlNavigationOverlay");

  const navigationHeader = mark(panel.firstElementChild, "djlNavigationHeader");
  const logoSlot = navigationHeader?.firstElementChild as HTMLElement | null;
  if (logoSlot) {
    logoSlot.querySelector(":scope > svg")?.setAttribute("data-djl-vendor-logo", "");
    if (!logoSlot.querySelector('[data-djl-studio-brand="navigation"]')) {
      logoSlot.append(createBrand("navigation"));
    }
  }

  const closeButton = navigationHeader?.querySelector<HTMLButtonElement>("button");
  if (closeButton) {
    closeButton.setAttribute("aria-label", "Cerrar navegación editorial");
    closeButton.title = "Cerrar navegación editorial";
  }

  headings.forEach((heading) => mark(heading, "djlNavigationHeading"));

  const collectionsList = collectionsHeading.nextElementSibling;
  if (collectionsList instanceof HTMLUListElement && !panel.dataset.djlNavigationOrganized) {
    panel.dataset.djlNavigationOrganized = "";
    collectionsList.querySelectorAll("[data-djl-navigation-group]").forEach((group) => group.remove());
    const items = new Map<string, HTMLLIElement>();
    NAVIGATION_ORDER.forEach((collection) => {
      const link = panel.querySelector<HTMLAnchorElement>(`a[href*="/collections/${collection}/"]`);
      const item = link?.closest("li");
      if (item) items.set(collection, item);
    });
    NAVIGATION_ORDER.forEach((collection) => {
      const item = items.get(collection);
      if (item) collectionsList.append(item);
    });

    const insertGroup = (before: string, label: string) => {
      const target = items.get(before);
      if (!target) return;
      const group = document.createElement("li");
      group.dataset.djlNavigationGroup = "";
      group.setAttribute("role", "presentation");
      group.textContent = label;
      target.before(group);
    };
    insertGroup("researchAreas", "Contenido científico");
    insertGroup("media", "Recursos");
  }

  const utilityLabels = ["Media Manager", "Biblioteca de medios", "Media Usage", "Uso de medios"];
  [...panel.querySelectorAll<HTMLButtonElement>("button")].forEach((button) => {
    if (utilityLabels.includes(button.textContent?.trim() || "")) {
      mark(button.closest("li"), "djlNavigationUtility");
    }
  });
  const toolsHeading = headings.find((heading) =>
    ["Dashboard", "Herramientas"].includes(heading.textContent?.trim() || ""),
  );
  mark(toolsHeading, "djlNavigationUtility");
  mark(toolsHeading?.nextElementSibling, "djlNavigationUtility");

  const currentCollection = window.location.hash.match(/\/collections\/([^/]+)/u)?.[1]
    || (currentPageRoute() ? "pages" : null);
  panel.querySelectorAll<HTMLAnchorElement>('a[href*="/collections/"]').forEach((link) => {
    const active = Boolean(currentCollection && link.href.includes(`/collections/${currentCollection}/`));
    if (active) {
      link.dataset.djlNavigationActive = "";
      link.setAttribute("aria-current", "page");
    } else {
      delete link.dataset.djlNavigationActive;
      link.removeAttribute("aria-current");
    }
  });

  const version = [...panel.querySelectorAll<HTMLElement>("div, span")].find((element) =>
    /^TinaCMS v\d/u.test(element.textContent?.trim() || "") && element.children.length === 0,
  );
  mark(version, "djlNavigationUtility");
};

const translateInterface = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((node) => {
    const source = node.nodeValue?.trim();
    if (!source) return;
    const translation = INTERFACE_TRANSLATIONS.get(source);
    if (translation) node.nodeValue = node.nodeValue?.replace(source, translation) || translation;
  });
};

const enhanceStudio = () => {
  installStudioAssets();
  translateInterface();
  enterEditMode();
  enhanceSidebarHeader();
  enhanceForm();
  enhanceNavigation();
  translateInterface();
  advancePrimaryForm();
};

export const configureStudioCms = (cms: TinaCMS) => {
  if (cms.sidebar) {
    cms.sidebar.position = "displace";
    cms.sidebar.buttons = { reset: "Descartar", save: "Guardar" };
  }

  if (typeof window === "undefined" || typeof document === "undefined") return cms;

  const studioWindow = window as StudioWindow;
  if (!studioWindow.__diazJaraContentListener) {
    window.addEventListener("djl:open-primary-content", openPrimaryContent);
    studioWindow.__diazJaraContentListener = true;
  }
  enhanceStudio();
  if (!studioWindow.__diazJaraStudioObserver) {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        enhanceStudio();
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("hashchange", schedule);
    studioWindow.__diazJaraStudioObserver = observer;
    studioWindow.__diazJaraStudioSchedule = schedule;
  }

  return cms;
};
