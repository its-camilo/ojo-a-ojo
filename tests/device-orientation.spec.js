import { test, expect } from '@playwright/test';

const GYRO_ANGULAR_GAIN = 0.35;
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const DEG = Math.PI / 180;

function iosGyroInitScript() {
  if (!window.DeviceOrientationEvent) {
    window.DeviceOrientationEvent = class DeviceOrientationEvent extends Event {};
  }
  window.DeviceOrientationEvent.requestPermission = () => Promise.resolve('granted');
  Object.defineProperty(window.screen, 'orientation', {
    configurable: true,
    value: {
      angle: 90,
      addEventListener() {},
      removeEventListener() {},
    },
  });
  window.orientation = 90;
}

function quatAngleRad(q1, q2) {
  const dot = Math.min(
    1,
    Math.abs(q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w)
  );
  return 2 * Math.acos(dot);
}

function quatAngleDeg(q1, q2) {
  return (quatAngleRad(q1, q2) * 180) / Math.PI;
}

async function tapRecenterButton(page) {
  const recenter = page.locator('#btn-recenter');
  await expect(recenter).toBeVisible();
  await recenter.dispatchEvent('pointerdown');
}

async function settleOrientation(page, alpha, beta, gamma) {
  await page.evaluate(
    ({ alpha, beta, gamma }) => {
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientation', { alpha, beta, gamma })
      );
      const session = window.__OJO_A_OJO__?.viewerSession;
      if (!session?.controls?.applyToObject || !session.stereo?.head) return;
      for (let i = 0; i < 80; i++) {
        session.controls.applyToObject(session.stereo.head);
      }
    },
    { alpha, beta, gamma }
  );
}

async function openCardboardModule(page, moduleIndex = 0) {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'ojo-a-ojo-calibration-v1',
      JSON.stringify({
        ppi: 400,
        ppiManual: true,
        ipdMm: 63.9,
        k1: 0.33582564,
        k2: 0.55348791,
        lensEyeDistanceMm: 39.3,
        noniusOffsetPx: 0,
        gyroEnabled: true,
      })
    );
  });
  await page.getByRole('button', { name: /Cardboard móvil/i }).click();
  await page.getByRole('button', { name: /Guardar y continuar/i }).click();
  await page.getByRole('button', { name: 'Abrir módulo' }).nth(moduleIndex).click();
  await expect(page.locator('canvas.viewer-canvas')).toBeVisible({ timeout: 15000 });
}

function readHeadQuat(page) {
  return page.evaluate(() => {
    const head = window.__OJO_A_OJO__?.viewerSession?.stereo?.head;
    if (!head) return null;
    const q = head.quaternion;
    return { x: q.x, y: q.y, z: q.z, w: q.w };
  });
}

function readGyroEnabled(page) {
  return page.evaluate(() => {
    const ctrl = window.__OJO_A_OJO__?.viewerSession?.controls;
    return ctrl?.enabled === true;
  });
}

test.describe('Device orientation en visor Cardboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(iosGyroInitScript);
  });

  test('suscribe deviceorientation tras abrir módulo (iOS concedido)', async ({ page }) => {
    await openCardboardModule(page);
    await expect.poll(() => readGyroEnabled(page)).toBe(true);
  });

  test('rota el rig estéreo al emitir α/β/γ (landscape)', async ({ page }) => {
    await openCardboardModule(page);
    await settleOrientation(page, 10, 50, 5);
    const before = await readHeadQuat(page);
    expect(before).toBeTruthy();

    await settleOrientation(page, 30, 50, 15);
    const mid = await readHeadQuat(page);

    await settleOrientation(page, 120, 20, -8);
    const after = await readHeadQuat(page);

    expect(mid).not.toEqual(before);
    expect(after).not.toEqual(mid);
  });

  test('compensa orientación de pantalla en landscape 90° y -90°', async ({ page }) => {
    await openCardboardModule(page);
    await page.waitForTimeout(150);

    const at90 = await page.evaluate(() => {
      window.screen.orientation.angle = 90;
      window.orientation = 90;
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientation', { alpha: 60, beta: 85, gamma: 12 })
      );
      const session = window.__OJO_A_OJO__.viewerSession;
      for (let i = 0; i < 40; i++) session.controls.applyToObject(session.stereo.head);
      const q = session.stereo.head.quaternion;
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    });

    const atNeg90 = await page.evaluate(() => {
      window.screen.orientation.angle = -90;
      window.orientation = -90;
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientation', { alpha: 60, beta: 85, gamma: 12 })
      );
      const session = window.__OJO_A_OJO__.viewerSession;
      for (let i = 0; i < 40; i++) session.controls.applyToObject(session.stereo.head);
      const q = session.stereo.head.quaternion;
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    });

    expect(quatAngleDeg(at90, atNeg90)).toBeGreaterThan(0.5);
  });

  test('Recentrar deja head en identidad (landscape iOS, β/γ inclinados)', async ({ page }) => {
    await openCardboardModule(page, 1);
    await settleOrientation(page, 127, 88, -14);
    await tapRecenterButton(page);
    await settleOrientation(page, 127, 88, -14);
    const after = await readHeadQuat(page);
    expect(quatAngleDeg(after, IDENTITY)).toBeLessThan(0.5);
  });

  test('Recentrar centra el retículo en NDC (landscape)', async ({ page }) => {
    await openCardboardModule(page, 1);
    await settleOrientation(page, 200, 45, 8);
    await tapRecenterButton(page);
    await settleOrientation(page, 200, 45, 8);

    const ndc = await page.evaluate(() => {
      const session = window.__OJO_A_OJO__.viewerSession;
      const aim = session.stereo.reticle?.children?.[0] ?? session.stereo.reticle;
      if (!aim) return null;
      return session.projectToNdc(aim);
    });

    expect(ndc).toBeTruthy();
    expect(Math.abs(ndc.x)).toBeLessThan(0.08);
    expect(Math.abs(ndc.y)).toBeLessThan(0.08);
  });

  test('giro 60° produce ~60°×0.35 en horizontal sin salto de eje', async ({ page }) => {
    await openCardboardModule(page);
    await settleOrientation(page, 20, 75, 6);
    await tapRecenterButton(page);
    await settleOrientation(page, 20, 75, 6);
    const neutral = await readHeadQuat(page);

    await settleOrientation(page, 80, 75, 6);
    const turned = await readHeadQuat(page);
    const cameraDeg = quatAngleDeg(neutral, turned);
    const expected = 60 * GYRO_ANGULAR_GAIN;
    expect(cameraDeg).toBeGreaterThan(expected * 0.55);
    expect(cameraDeg).toBeLessThan(expected * 1.45);
  });

  test('botón Recentrar visible y clickeable', async ({ page }) => {
    await openCardboardModule(page);
    const recenter = page.getByRole('button', { name: 'Recentrar' });
    await expect(recenter).toBeVisible();
    await expect(recenter).toBeEnabled();
    await settleOrientation(page, 80, 35, 5);
    await tapRecenterButton(page);
    await settleOrientation(page, 80, 35, 5);
    expect(quatAngleDeg(await readHeadQuat(page), IDENTITY)).toBeLessThan(0.5);
  });

  test('sensibilidad reducida tras recentrar (ganancia angular)', async ({ page }) => {
    await openCardboardModule(page);

    await settleOrientation(page, 10, 40, 0);
    await tapRecenterButton(page);
    await settleOrientation(page, 10, 40, 0);
    const neutralPose = await readHeadQuat(page);

    await settleOrientation(page, 70, 40, 0);
    const turned = await readHeadQuat(page);
    const cameraDeltaRad = quatAngleRad(neutralPose, turned);
    const deviceDeltaRad = 60 * DEG;

    expect(cameraDeltaRad).toBeLessThan(deviceDeltaRad * 0.75);
    expect(cameraDeltaRad).toBeGreaterThan(deviceDeltaRad * (GYRO_ANGULAR_GAIN - 0.15));
    expect(cameraDeltaRad).toBeLessThan(deviceDeltaRad * (GYRO_ANGULAR_GAIN + 0.15));
  });
});

test.describe('Detección automática de PPI', () => {
  test('calibración muestra PPI auto sin intervención manual', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('ojo-a-ojo-calibration-v1'));
    await page.reload();

    await page.getByRole('button', { name: /Modo escritorio/i }).click();
    const card = page.locator('#card-ppi');
    await expect(card).toHaveAttribute('data-ppi-source', 'auto');
    await expect(page.getByTestId('ppi-auto-status')).toContainText(/Detectado automáticamente/i);
    await expect(page.getByTestId('screen-landscape-guide')).toBeVisible();

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('ojo-a-ojo-calibration-v1');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored?.ppiManual).toBe(false);
    expect(stored?.ppi).toBeGreaterThan(80);
    expect(stored?.ppiAuto).toBe(stored?.ppi);
  });

  test('iPhone con screen.width corto detecta ancho horizontal largo', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, 'width', { configurable: true, get: () => 390 });
      Object.defineProperty(window.screen, 'height', { configurable: true, get: () => 844 });
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 3 });
    });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('ojo-a-ojo-calibration-v1'));
    await page.reload();
    await page.getByRole('button', { name: /Cardboard móvil/i }).click();

    const det = await page.evaluate(() => window.__OJO_A_OJO__.getScreenDetection());
    expect(det.metrics.landscapeCssPx).toBe(844);
    expect(det.ppi).toBeGreaterThan(420);
  });
});