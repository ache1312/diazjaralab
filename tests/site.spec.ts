import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

const routes = [
  '/', '/investigacion/', '/tecnicas/', '/equipo/', '/publicaciones/', '/filosofia/', '/divulgacion/', '/contacto/',
  '/en/', '/en/research/', '/en/techniques/', '/en/team/', '/en/publications/', '/en/philosophy/', '/en/outreach/', '/en/contact/',
];

for (const route of routes) {
  test(`${route} renders with localized metadata and no horizontal overflow`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('main')).toBeVisible();
    const locale = route.startsWith('/en/') ? 'en' : 'es';
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
  });
}

test('language switch preserves the equivalent page', async ({ page }) => {
  await page.goto('/investigacion/');
  await page.locator('.lang-link:visible').first().click();
  await expect(page).toHaveURL(/\/en\/research\/$/);
});

test('theme follows the system, exposes its state, and persists across locales', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');

  const root = page.locator('html');
  const themeColor = page.locator('meta[name="theme-color"]');
  const spanishToggle = page.locator('[data-theme-toggle]:visible').first();

  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(themeColor).toHaveAttribute('content', '#081820');
  await expect(spanishToggle).toHaveAccessibleName('Modo oscuro');
  await expect(spanishToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(spanishToggle).toHaveAttribute('title', 'Cambiar a modo claro');
  const darkThemeAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .exclude('iframe')
    .analyze();
  expect(darkThemeAccessibility.violations).toEqual([]);

  await spanishToggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(themeColor).toHaveAttribute('content', '#f6f4ee');
  await expect(spanishToggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('diaz-jara-theme'))).toBe('light');

  await page.reload();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.goto('/en/');

  const englishToggle = page.locator('[data-theme-toggle]:visible').first();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(englishToggle).toHaveAccessibleName('Dark mode');
  await expect(englishToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(englishToggle).toHaveAttribute('title', 'Switch to dark mode');
});

test('normal-motion reveals become visible when their section enters the viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const recentWork = page.locator('.recent-work');
  const firstReveal = recentWork.locator('[data-reveal]').first();
  await firstReveal.scrollIntoViewIfNeeded();
  await expect(firstReveal).toHaveClass(/is-visible/);
});

test('mobile navigation opens, traps no content, and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only interaction');
  await page.goto('/');
  const toggle = page.locator('.menu-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('contact page exposes a usable fallback and lazy map', async ({ page }) => {
  await page.goto('/contacto/');
  const form = page.locator('#contact-form');
  if (process.env.PUBLIC_FORMSPREE_FORM_ID) {
    await expect(form).toHaveAttribute('action', `https://formspree.io/f/${process.env.PUBLIC_FORMSPREE_FORM_ID}`);
  } else {
    await expect(form).toHaveAttribute('action', /^mailto:/);
  }
  await expect(form.locator('[name="name"]')).toHaveAttribute('required', '');
  await page.locator('[data-load-map]').click();
  await expect(page.locator('[data-map-shell] iframe')).toHaveAttribute('src', /google\.com\/maps/);
});

test('techniques workflow exposes four typed stages and keeps anchor targets visible', async ({ page }) => {
  await page.goto('/tecnicas/');
  const links = page.locator('[data-tech-link]');
  await expect(links).toHaveCount(4);
  await expect(page.locator('.tech-capabilities small')).toHaveCount(16);

  const visualize = page.locator('[data-tech-link="visualize"]');
  await visualize.click();
  await expect(visualize).toHaveAttribute('aria-current', 'step');

  const geometry = await page.evaluate(() => {
    const target = document.querySelector('#visualize');
    const rail = document.querySelector('[data-tech-nav]');
    return {
      targetTop: target?.getBoundingClientRect().top ?? -1,
      railBottom: rail?.getBoundingClientRect().bottom ?? 0,
    };
  });
  expect(geometry.targetTop).toBeGreaterThanOrEqual(geometry.railBottom - 2);
});

test('publication explorer keeps graph previews and related rows coherent', async ({ page, request }, testInfo) => {
  await page.goto('/publicaciones/');
  await expect(page.locator('.network-node.is-theme-node')).toHaveCount(4);
  await expect(page.locator('.network-stats dd').nth(1)).toHaveText('4');
  const edgeWidths = await page.locator('.network-edge.is-paper-edge').evaluateAll((edges) => edges.map((edge) =>
    Number.parseFloat(getComputedStyle(edge).getPropertyValue('--edge-weight')),
  ));
  expect(Math.max(...edgeWidths) - Math.min(...edgeWidths)).toBeGreaterThan(1);

  const theme = page.locator('[data-network-node][data-node-kind="theme"]').last();
  await theme.click();
  await expect(theme).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-detail-theme-note]')).toBeVisible();
  const related = page.locator('[data-connection-id]');
  await expect(related).toHaveCount(6);
  const firstRelated = related.first();
  const targetId = await firstRelated.getAttribute('data-connection-id');
  const targetTitle = await firstRelated.getAttribute('title');
  expect(targetId).toBeTruthy();
  expect(targetTitle).toBeTruthy();
  const relatedStyle = await firstRelated.evaluate((button) => ({
    display: getComputedStyle(button).display,
    background: getComputedStyle(button).backgroundColor,
    color: getComputedStyle(button).color,
    minHeight: button.getBoundingClientRect().height,
  }));
  expect(relatedStyle.display).toBe('grid');
  expect(relatedStyle.background).toBe('rgba(0, 0, 0, 0)');
  expect(relatedStyle.color).not.toBe('rgb(0, 0, 0)');
  expect(relatedStyle.minHeight).toBeGreaterThanOrEqual(44);

  if (!testInfo.project.name.startsWith('mobile')) {
    const previewNode = page.locator('[data-network-node][data-node-kind="paper"]').nth(1);
    const previewId = await previewNode.getAttribute('data-network-node');
    const previewTitle = await page.locator('[data-network-data]').evaluate((script, nodeId) => {
      const data = JSON.parse(script.textContent ?? '{"nodes":[]}');
      return data.nodes.find((node: { id: string }) => node.id === nodeId)?.title ?? '';
    }, previewId);
    const indicator = page.locator('[data-network-indicator]');
    const indicatorBefore = await indicator.evaluate((element) => getComputedStyle(element).transform);
    await previewNode.hover();
    await expect(page.locator('[data-detail-title]')).toHaveText(previewTitle);
    await expect(previewNode).toHaveClass(/is-preview/);
    await expect(theme).toHaveAttribute('aria-pressed', 'true');
    await expect(indicator).not.toHaveCSS('transform', indicatorBefore);
    await page.locator('.network-canvas').hover({ position: { x: 6, y: 6 } });

    const selectedTitle = await page.locator('[data-detail-title]').textContent();
    await firstRelated.hover();
    await expect(page.locator(`[data-network-node="${targetId}"]`)).toHaveClass(/is-preview/);
    await expect(theme).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-detail-title]')).toHaveText(selectedTitle ?? '');
  }

  await firstRelated.click();
  await expect(page.locator(`[data-network-node="${targetId}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-detail-title]')).toHaveText(targetTitle ?? '');
  await expect(page.locator('[data-detail-title]')).toBeFocused();
  await expect(page.locator('[data-detail-connections] .detail-connection-button').first()).toHaveCSS('display', 'grid');
  const dynamicDetailA11y = await new AxeBuilder({ page })
    .include('[data-network-detail]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(dynamicDetailA11y.violations).toEqual([]);

  const curatedCount = await page.locator('[data-publication]').count();
  await expect(page.locator('[data-publication]:visible')).toHaveCount(Math.min(25, curatedCount));
  await page.locator('[data-publication-filter="all"]').click();
  await expect(page.locator('[data-publication]:visible')).toHaveCount(curatedCount);
  await page.locator('[data-publication-search]').fill('Non-Canonical Control');
  await expect(page.locator('[data-publication]:visible')).toHaveCount(1);
  await expect(page.locator('[data-publication]:visible h3')).toContainText('Non-Canonical Control');
  const bib = await request.get('/esteban-diaz-jara-publications.bib');
  expect(bib.ok()).toBeTruthy();
  const bibText = await bib.text();
  expect(bibText).toContain('@article');
  expect(bibText).toContain('Non-Canonical Control');
});

for (const route of ['/', '/investigacion/', '/tecnicas/', '/equipo/', '/publicaciones/', '/contacto/', '/en/', '/en/techniques/', '/en/publications/']) {
  test(`${route} has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).exclude('iframe').analyze();
    expect(results.violations).toEqual([]);
  });
}
