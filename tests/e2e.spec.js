import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/opt/cursor/artifacts/playwright-screenshots';
const ARTIFACTS = '/opt/cursor/artifacts';

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACTS, { recursive: true });
});

async function completeSequentialModule(page, moduleId, maxSteps = 48) {
  const isRecorded = () =>
    page.evaluate((id) => {
      const raw = localStorage.getItem('ojo-a-ojo-results-v1');
      const mods = raw ? JSON.parse(raw).modules ?? {} : {};
      return Boolean(mods[id]);
    }, moduleId);

  if (await isRecorded()) return;

  for (let i = 0; i < maxSteps; i++) {
    if (await isRecorded()) return;
    await page.evaluate(() => {
      const mod = window.__OJO_A_OJO__?.viewerSession?.activeModule;
      if (!mod) return;
      const buttons = mod.getInteractables?.() ?? [];
      if (!buttons.length) return;
      const terminate = buttons.find((b) => {
        const label = String(b.userData?.label ?? '');
        return label.includes('Equilibrado') || label.includes('Terminar');
      });
      mod.onGazeSelect?.(terminate ?? buttons[0]);
    });
    await page.waitForTimeout(140);
  }
  if (!(await isRecorded())) {
    throw new Error(`El módulo ${moduleId} no registró resultados tras ${maxSteps} pasos`);
  }
}

async function startCardboardFlow(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('ojo-a-ojo-results-v1');
    localStorage.removeItem('ojo-a-ojo-calibration-v1');
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Ojo a Ojo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Calibración/i })).toHaveCount(0);
  await page.screenshot({ path: path.join(ARTIFACTS, 'home.png'), fullPage: true });
  await page.getByRole('button', { name: /Comenzar con Cardboard/i }).click();
  await expect(page).toHaveURL(/\/calibracion\/?$/);
  await page.getByRole('button', { name: /Guardar y continuar/i }).click();
  await expect(page).toHaveURL(/\/sesion\/?$/);
  await expect(page.getByRole('heading', { name: /Pruebas 3D/i })).toBeVisible();
}

test('Ojo a Ojo — flujo Cardboard completo sin errores WebGL', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await startCardboardFlow(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-calibration-modules.png'), fullPage: true });

  const moduleShots = [
    '03-modulo-balance.png',
    '04-modulo-hollow.png',
    '05-modulo-ames.png',
    '06-modulo-rds.png',
  ];

  for (let i = 0; i < moduleShots.length; i++) {
    await page.getByRole('button', { name: 'Abrir módulo' }).nth(i).click();
    const canvas = page.locator('canvas.viewer-canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });
    const dwellMs = await page.evaluate(
      () => window.__OJO_A_OJO__?.viewerSession?.gaze?.dwellMs ?? 0
    );
    expect(dwellMs).toBe(3000);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, moduleShots[i]), fullPage: true });
    await page.evaluate(() => window.__OJO_A_OJO__?.viewerSession?.completeForE2e());
    await expect(page.getByRole('heading', { name: /Pruebas 3D/i })).toBeVisible({ timeout: 15000 });
  }

  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('ojo-a-ojo-results-v1');
    return raw ? JSON.parse(raw) : null;
  });
  expect(saved?.modules?.balance?.imbalanceRatio).toBeDefined();
  expect(saved?.modules?.['hollow-mask']?.stereoPercept).toBeTruthy();
  expect(saved?.modules?.ames?.stereoJudgment).toBeTruthy();
  expect(saved?.modules?.rds?.stereoDepth).toBeTruthy();

  await page.getByRole('button', { name: /Finalizar y ver resumen/i }).click();
  await expect(page).toHaveURL(/\/resumen\/?$/);
  await expect(page.getByRole('heading', { name: /Resumen de tamizaje/i })).toBeVisible();

  const summary = page.getByTestId('summary-table');
  await expect(summary).not.toContainText('No realizado en esta sesión');
  await expect(page.getByTestId('summary-card-balance')).toBeVisible();
  await expect(page.getByTestId('summary-card-hollow-mask')).toBeVisible();
  await expect(page.getByTestId('summary-card-ames')).toBeVisible();
  await expect(page.getByTestId('summary-card-rds')).toBeVisible();
  await expect(page.getByTestId('summary-metrics-balance')).toContainText(/Razón de balance/);
  await expect(page.getByTestId('summary-metrics-rds')).toContainText(/Disparidad: 6 px/);
  await expect(page.getByTestId('summary-global')).toContainText(/.+/);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-resumen.png'), fullPage: true });

  const webglOk = await page.evaluate(() => {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  expect(webglOk).toBeTruthy();

  const severe = [...consoleErrors, ...pageErrors].filter(
    (t) => !t.includes('Fullscreen') && !t.includes('requestFullscreen')
  );
  expect(severe, `Errores de consola/página: ${severe.join('\n')}`).toHaveLength(0);
});

test('Recorrido secuencial — 4 módulos, tarjetas y JSON completos', async ({ page }) => {
  await startCardboardFlow(page);
  await page.getByRole('button', { name: /Recorrido secuencial/i }).click();

  const moduleOrder = ['balance', 'hollow-mask', 'ames', 'rds'];
  for (let m = 0; m < moduleOrder.length; m++) {
    await expect(page.locator('canvas.viewer-canvas')).toBeVisible({ timeout: 20000 });
    await completeSequentialModule(page, moduleOrder[m]);
    if (m < moduleOrder.length - 1) {
      await expect
        .poll(async () => page.locator('canvas.viewer-canvas').isVisible(), { timeout: 20000 })
        .toBeTruthy();
    }
  }

  await expect(page).toHaveURL(/\/resumen\/?$/);
  await expect(page.getByRole('heading', { name: /Resumen de tamizaje/i })).toBeVisible();

  const summary = page.getByTestId('summary-table');
  await expect(summary).not.toContainText('No realizado en esta sesión');
  await expect(summary).not.toContainText('pendiente');
  for (const id of moduleOrder) {
    await expect(page.getByTestId(`summary-card-${id}`)).toBeVisible();
    await expect(page.getByTestId(`summary-metrics-${id}`)).toContainText(/.+/);
  }

  const parsed = await page.evaluate(() => {
    const raw = localStorage.getItem('ojo-a-ojo-results-v1');
    return raw ? JSON.parse(raw) : null;
  });
  expect(parsed?.modules?.balance?.imbalanceRatio).toBeDefined();
  expect(parsed?.modules?.['hollow-mask']?.stereoPercept).toBeTruthy();
  expect(parsed?.modules?.ames?.stereoJudgment).toBeTruthy();
  expect(parsed?.modules?.rds?.stereoDepth).toBeTruthy();

  const exportOk = await page.evaluate(() => {
    const snap = JSON.parse(JSON.stringify(window.__OJO_A_OJO__.appState.session));
    return ['balance', 'hollow-mask', 'ames', 'rds'].every((id) => Boolean(snap.modules?.[id]));
  });
  expect(exportOk).toBeTruthy();
});

test('Router SPA — resumen sin sesión redirige a inicio', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('ojo-a-ojo-results-v1'));
  await page.goto('/resumen');
  await expect(page).toHaveURL(/\/?$/);
  await expect(page.getByRole('heading', { name: /Ojo a Ojo/i })).toBeVisible();
});

test('Capturas de entrega en artifacts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('ojo-a-ojo-results-v1');
    localStorage.removeItem('ojo-a-ojo-calibration-v1');
  });
  await page.reload();
  await page.screenshot({ path: path.join(ARTIFACTS, 'home.png'), fullPage: true });
  await page.screenshot({ path: path.join(ARTIFACTS, 'landing-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await page.screenshot({ path: path.join(ARTIFACTS, 'landing-mobile-landscape.png'), fullPage: true });

  await page.getByRole('button', { name: /Comenzar con Cardboard/i }).click();
  await page.screenshot({ path: path.join(ARTIFACTS, 'calibration-landscape.png'), fullPage: true });
  await page.getByRole('button', { name: /Guardar y continuar/i }).click();

  const sceneNames = [
    ['scene-dicoptic.png', 0],
    ['scene-hollow-mask.png', 1],
    ['scene-ames-room.png', 2],
    ['scene-rds.png', 3],
  ];

  for (const [file, index] of sceneNames) {
    await page.getByRole('button', { name: 'Abrir módulo' }).nth(index).click();
    await expect(page.locator('canvas.viewer-canvas')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACTS, file), fullPage: true });
    await page.evaluate(() => window.__OJO_A_OJO__?.viewerSession?.completeForE2e());
    await expect(page.getByRole('heading', { name: /Pruebas 3D/i })).toBeVisible({ timeout: 15000 });
  }

  await page.getByRole('button', { name: /Finalizar y ver resumen/i }).click();
  await expect(page.getByRole('heading', { name: /Resumen de tamizaje/i })).toBeVisible();
  await page.screenshot({ path: path.join(ARTIFACTS, 'summary.png'), fullPage: true });
});