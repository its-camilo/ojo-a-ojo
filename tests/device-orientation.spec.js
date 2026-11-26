import { test, expect } from '@playwright/test';

const GYRO_ANGULAR_GAIN = 0.68;

function iosGyroInitScript() {
  if (!window.DeviceOrientationEvent) {
    window.DeviceOrientationEvent = class DeviceOrientationEvent extends Event {};
  }
  window.DeviceOrientationEvent.requestPermission = () => Promise.resolve('granted');
  Object.defineProperty(window.screen, 'orientation', {
    configurable: true,
    value: {
      angle: 0,
      addEventListener() {},
      removeEventListener() {},
    },
  });
  window.orientation = 0;
}

function quatAngleRad(q1, q2) {
  const dot = Math.min(
    1,
    Math.abs(q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w)
  );
  return 2 * Math.acos(dot);
}

async function tapRecenterButton(page) {
  const recenter = page.locator('#btn-recenter');
  await expect(recenter).toBeVisible();
  await recenter.evaluate((node) => node.click());
}

async function settleOrientation(page, alpha, beta, gamma) {
  await page.evaluate(
    ({ alpha, beta, gamma }) => {
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientation', { alpha, beta, gamma })
      );
      const session = window.__OJO_A_OJO__?.viewerSession;
      if (!session?.controls?.applyToObject || !session.stereo?.head) return;
      for (let i = 0; i < 60; i++) {
        session.controls.applyToObject(session.stereo.head);
      }
    },
    { alpha, beta, gamma }
  );
}

async function openCardboardModule(page) {
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
  await page.getByRole('button', { name: 'Abrir módulo' }).first().click();
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

  test('rota el rig estéreo al emitir α/β/γ (retrato)', async ({ page }) => {
    await openCardboardModule(page);
    await page.waitForTimeout(200);
    const before = await readHeadQuat(page);
    expect(before).toBeTruthy();

    await settleOrientation(page, 30, 50, 15);
    const mid = await readHeadQuat(page);

    await settleOrientation(page, 120, 20, -8);
    const after = await readHeadQuat(page);

    expect(mid).not.toEqual(before);
    expect(after).not.toEqual(mid);
  });

  test('compensa orientación de pantalla en landscape', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.screen, 'orientation', {
        configurable: true,
        value: {
          angle: 90,
          addEventListener() {},
          removeEventListener() {},
        },
      });
      window.orientation = 90;
    });
    await openCardboardModule(page);
    await page.waitForTimeout(150);

    const portraitQuat = await page.evaluate(() => {
      window.screen.orientation.angle = 0;
      window.orientation = 0;
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientation', { alpha: 60, beta: 40, gamma: 5 })
      );
      const session = window.__OJO_A_OJO__.viewerSession;
      for (let i = 0; i < 40; i++) session.controls.applyToObject(session.stereo.head);
      const q = session.stereo.head.quaternion;
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    });

    const landscapeQuat = await page.evaluate(() => {
      window.screen.orientation.angle = 90;
      window.orientation = 90;
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientation', { alpha: 60, beta: 40, gamma: 5 })
      );
      const session = window.__OJO_A_OJO__.viewerSession;
      for (let i = 0; i < 40; i++) session.controls.applyToObject(session.stereo.head);
      const q = session.stereo.head.quaternion;
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    });

    expect(landscapeQuat).not.toEqual(portraitQuat);
  });

  test('recentrar fija yaw inicial', async ({ page }) => {
    await openCardboardModule(page);
    await settleOrientation(page, 200, 30, 0);
    const beforeRecenter = await readHeadQuat(page);

    await page.evaluate(() => window.__OJO_A_OJO__.viewerSession.recenterGyro());
    await settleOrientation(page, 200, 30, 0);
    const afterSameOrientation = await readHeadQuat(page);

    await settleOrientation(page, 260, 30, 0);
    const afterTurn = await readHeadQuat(page);

    expect(afterSameOrientation).not.toEqual(beforeRecenter);
    expect(afterTurn).not.toEqual(afterSameOrientation);
  });

  test('botón Recentrar visible, encima del canvas y clickeable', async ({ page }) => {
    await openCardboardModule(page);
    const recenter = page.getByRole('button', { name: 'Recentrar' });
    await expect(recenter).toBeVisible();
    await expect(recenter).toBeEnabled();

    const layout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.viewer-canvas');
      const btn = document.getElementById('btn-recenter');
      if (!canvas || !btn) return null;
      const cRect = canvas.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      return {
        buttonOverlapsCanvas: bRect.bottom > cRect.top,
        hudAboveMount: parseInt(getComputedStyle(btn.closest('.viewer-hud')).zIndex, 10) >= 50,
      };
    });
    expect(layout?.buttonOverlapsCanvas).toBe(true);
    expect(layout?.hudAboveMount).toBe(true);

    await settleOrientation(page, 80, 35, 5);
    const before = await readHeadQuat(page);
    await tapRecenterButton(page);
    await settleOrientation(page, 80, 35, 5);
    const after = await readHeadQuat(page);
    expect(quatAngleRad(before, after)).toBeGreaterThan(0.08);
  });

  test('Recentrar devuelve yaw efectivo a ~0° tras giro', async ({ page }) => {
    await openCardboardModule(page);

    await settleOrientation(page, 55, 45, 0);
    const beforeRecenter = await readHeadQuat(page);

    await tapRecenterButton(page);
    await settleOrientation(page, 55, 45, 0);
    const neutralPose = await readHeadQuat(page);
    expect(quatAngleRad(beforeRecenter, neutralPose)).toBeGreaterThan(0.12);

    await settleOrientation(page, 115, 45, 0);
    const afterTurn = await readHeadQuat(page);
    const effectiveYaw = quatAngleRad(neutralPose, afterTurn);
  const deviceYawRad = ((115 - 55) * Math.PI) / 180;

    expect(effectiveYaw).toBeGreaterThan(0.06);
    expect(effectiveYaw).toBeLessThan(deviceYawRad * 0.95);
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
    const deviceDeltaRad = ((70 - 10) * Math.PI) / 180;

    expect(cameraDeltaRad).toBeLessThan(deviceDeltaRad * 0.95);
    expect(cameraDeltaRad).toBeGreaterThan(deviceDeltaRad * (GYRO_ANGULAR_GAIN - 0.2));
    expect(cameraDeltaRad).toBeLessThan(deviceDeltaRad * (GYRO_ANGULAR_GAIN + 0.2));
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

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('ojo-a-ojo-calibration-v1');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored?.ppiManual).toBe(false);
    expect(stored?.ppi).toBeGreaterThan(80);
    expect(stored?.ppiAuto).toBe(stored?.ppi);
  });
});