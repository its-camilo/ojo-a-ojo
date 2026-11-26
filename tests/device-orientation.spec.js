import { test, expect } from '@playwright/test';

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

async function emitOrientation(page, alpha, beta, gamma) {
  await page.evaluate(
    ({ alpha, beta, gamma }) => {
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientation', { alpha, beta, gamma })
      );
      const session = window.__OJO_A_OJO__?.viewerSession;
      if (session?.controls?.applyToObject && session.stereo?.head) {
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

    await emitOrientation(page, 30, 50, 15);
    const mid = await readHeadQuat(page);

    await emitOrientation(page, 120, 20, -8);
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
      const q = window.__OJO_A_OJO__.viewerSession.stereo.head.quaternion;
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    });

    const landscapeQuat = await page.evaluate(() => {
      window.screen.orientation.angle = 90;
      window.orientation = 90;
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientation', { alpha: 60, beta: 40, gamma: 5 })
      );
      const q = window.__OJO_A_OJO__.viewerSession.stereo.head.quaternion;
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    });

    expect(landscapeQuat).not.toEqual(portraitQuat);
  });

  test('recentrar fija yaw inicial', async ({ page }) => {
    await openCardboardModule(page);
    await emitOrientation(page, 200, 30, 0);
    const beforeRecenter = await readHeadQuat(page);

    await page.evaluate(() => window.__OJO_A_OJO__.viewerSession.recenterGyro());
    await emitOrientation(page, 200, 30, 0);
    const afterSameOrientation = await readHeadQuat(page);

    await emitOrientation(page, 260, 30, 0);
    const afterTurn = await readHeadQuat(page);

    expect(afterSameOrientation).not.toEqual(beforeRecenter);
    expect(afterTurn).not.toEqual(afterSameOrientation);
  });
});