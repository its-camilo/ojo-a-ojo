import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/opt/cursor/artifacts/playwright-screenshots';
const ARTIFACTS = '/opt/cursor/artifacts';

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACTS, { recursive: true });
});

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

  const table = page.getByTestId('summary-table');
  await expect(table).not.toContainText('No realizado');
  await expect(table.getByRole('cell', { name: 'Balance dicóptico 3D', exact: true })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Máscara hueca 3D', exact: true })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Cuarto de Ames 3D', exact: true })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'RDS 3D grueso (Julesz)', exact: true })).toBeVisible();
  await expect(table.locator('.metrics-cell').first()).toContainText(/Razón de balance/);
  await expect(table.locator('.metrics-cell').nth(3)).toContainText(/Disparidad: 6 px/);

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