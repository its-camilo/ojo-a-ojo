import { test, expect } from '@playwright/test';

const IOS_LANDSCAPE_SCREENS = [
  { name: 'iPhone 14 landscape', width: 844, height: 390, screenW: 390, screenH: 844, dpr: 3 },
  { name: 'iPhone 15 landscape', width: 852, height: 393, screenW: 393, screenH: 852, dpr: 3 },
];

async function openCalibrationLandscape(page, screen) {
  await page.addInitScript(
    ({ screenW, screenH, dpr }) => {
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => dpr });
      Object.defineProperty(window.screen, 'width', { configurable: true, get: () => screenW });
      Object.defineProperty(window.screen, 'height', { configurable: true, get: () => screenH });
      Object.defineProperty(window, 'orientation', { configurable: true, writable: true, value: 90 });
      Object.defineProperty(window.screen, 'orientation', {
        configurable: true,
        value: { angle: 90, addEventListener() {}, removeEventListener() {} },
      });
    },
    { screenW: screen.screenW, screenH: screen.screenH, dpr: screen.dpr }
  );

  await page.setViewportSize({ width: screen.width, height: screen.height });
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('ojo-a-ojo-calibration-v1'));
  await page.reload();
  await page.getByRole('button', { name: /Cardboard móvil/i }).click();
  await expect(page.getByRole('heading', { name: /Calibración/i })).toBeVisible();
}

test.describe('Calibración — guías punteadas en horizontal (iOS)', () => {
  for (const screen of IOS_LANDSCAPE_SCREENS) {
    test(`${screen.name}: detector y tarjeta en proporción horizontal`, async ({ page }) => {
      await openCalibrationLandscape(page, screen);

      const layout = await page.evaluate(() => {
        const guide = document.getElementById('screen-landscape-guide');
        const card = document.getElementById('card-visual');
        const canvas = document.getElementById('nonius-canvas');
        const main = document.querySelector('.screen--calibration');
        const det = window.__OJO_A_OJO__?.getScreenDetection?.();
        if (!guide || !card || !canvas || !main) return null;
        const g = guide.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        const cv = canvas.getBoundingClientRect();
        return {
          orientation: main.dataset.calibOrientation,
          viewportW: window.innerWidth,
          viewportH: window.innerHeight,
          guideW: g.width,
          guideH: g.height,
          cardW: c.width,
          cardH: c.height,
          cardWiderThanTall: c.width > c.height,
          canvasCssW: cv.width,
          canvasW: canvas.width,
          canvasH: canvas.height,
          canvasWiderThanTall: canvas.width > canvas.height,
          detectedLandscapePx: det?.metrics?.landscapeCssPx,
          detectedPpi: det?.ppi,
          landscapeWidthMm: det?.landscapeWidthMm,
        };
      });

      expect(layout).toBeTruthy();
      expect(layout.orientation).toBe('landscape');
      expect(layout.viewportW).toBeGreaterThan(layout.viewportH);
      expect(layout.guideW).toBeGreaterThan(layout.guideH * 2);
      expect(layout.guideW).toBeGreaterThanOrEqual(screen.width * 0.85);
      expect(layout.cardWiderThanTall).toBe(true);
      expect(layout.canvasWiderThanTall).toBe(true);
      expect(layout.detectedLandscapePx).toBe(screen.screenH);
      expect(layout.detectedPpi).toBeGreaterThan(400);
      expect(layout.landscapeWidthMm).toBeGreaterThan(130);
      expect(layout.landscapeWidthMm).toBeLessThan(180);
      expect(Math.abs(layout.canvasCssW - layout.guideW)).toBeLessThan(4);
      expect(layout.cardW / layout.cardH).toBeCloseTo(85.6 / 53.98, 1);
    });
  }
});