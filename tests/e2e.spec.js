import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/opt/cursor/artifacts/playwright-screenshots';

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test('Ojo a Ojo v1 — flujo escritorio sin errores WebGL', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('ojo-a-ojo-results-v1');
    localStorage.removeItem('ojo-a-ojo-calibration-v1');
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: /Ojo a Ojo/i })).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-home.png'), fullPage: true });

  await page.getByRole('button', { name: /Modo escritorio/i }).click();
  await page.getByRole('button', { name: /Guardar y continuar/i }).click();
  await expect(page.getByRole('heading', { name: /Pruebas 3D/i })).toBeVisible();
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
    await page.waitForTimeout(800);
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
  await expect(page.getByRole('heading', { name: /Resumen de tamizaje/i })).toBeVisible();

  const table = page.getByTestId('summary-table');
  await expect(table).not.toContainText('No realizado');
  await expect(table.getByRole('cell', { name: 'Balance dicóptico 3D', exact: true })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Máscara hueca 3D', exact: true })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Cuarto de Ames 3D', exact: true })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'RDS 3D grueso (Julesz)', exact: true })).toBeVisible();
  await expect(table.locator('pre.metrics-json').first()).toContainText(/imbalanceRatio/);
  await expect(table.locator('pre.metrics-json').nth(3)).toContainText(/disparityPx/);

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