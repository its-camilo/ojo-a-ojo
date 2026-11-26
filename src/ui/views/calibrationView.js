import {
  saveCalibration,
  DEFAULT_CALIBRATION,
  resetPpiToAuto,
  applyAutoScreenPpiIfNeeded,
} from '../../services/storage.js';
import { detectScreenPpi, formatAutoPpiLabel } from '../../services/screenDetection.js';
import {
  cardVisualSizePx,
  getCalibrationViewport,
  landscapeGuideWidthPx,
  NONIUS_HEIGHT,
} from '../../services/calibrationLayout.js';
import { DeviceOrientationController } from '../../services/deviceOrientation.js';

const CARD_W_MM = 85.6;
const CARD_H_MM = 53.98;

export function renderCalibration(root, state, { onNavigate }) {
  const freshAuto = applyAutoScreenPpiIfNeeded();
  const c = { ...freshAuto, ...state.calibration };
  if (!c.ppiManual) {
    const det = detectScreenPpi();
    c.ppi = det.ppi;
    c.ppiAuto = det.ppi;
    c.ppiProfileId = det.profileId;
  }
  const detection = detectScreenPpi();
  const { isLandscape } = getCalibrationViewport();
  const guideW = landscapeGuideWidthPx(detection);
  const cardPx = cardVisualSizePx(c.ppi);
  let gyroMonitor = null;
  let gyroCtrl = null;
  let layoutUnsub = null;

  root.innerHTML = `
    <main class="screen screen--calibration screen--calibration-landscape" data-calib-orientation="${isLandscape ? 'landscape' : 'portrait'}">
      <header>
        <h1>Calibración en pantalla normal</h1>
        <p class="lead">Ajustes guardados en este dispositivo. Hágalo con el celular en <strong>pantalla normal y horizontal</strong>, antes de meterlo en el Cardboard.</p>
      </header>

      <section class="card" id="card-ppi" data-ppi-source="${c.ppiManual ? 'manual' : 'auto'}" data-ppi-auto="${(c.ppiAuto ?? detection.ppi).toFixed(1)}">
        <h2>Tamaño real de pantalla (PPI)</h2>
        <p class="hint">Superpone una tarjeta bancaria (${CARD_W_MM}×${CARD_H_MM} mm) al rectángulo hasta que coincidan. Así las pruebas de disparidad y los botones 3D mantienen escala correcta en milímetros.</p>
        <p id="ppi-auto-status" class="hint" data-testid="ppi-auto-status">${
          c.ppiManual
            ? `Ajuste manual activo (${c.ppi.toFixed(1)} PPI). Puede volver a la detección automática.`
            : formatAutoPpiLabel(detection)
        }</p>
        <p class="hint">px/mm ≈ ${((c.ppi || detection.ppi) / 25.4).toFixed(3)} · ancho horizontal (Cardboard): ~${(detection.landscapeWidthMm ?? 0).toFixed(1)} mm · Coloque el celular en <strong>horizontal</strong> para calibrar el visor.</p>
        <div
          class="screen-landscape-guide"
          id="screen-landscape-guide"
          data-testid="screen-landscape-guide"
          style="width: ${guideW}px; max-width: 100%;"
        >
          <span class="screen-landscape-guide__label" id="screen-landscape-guide-label">
            Detector: ancho horizontal ${guideW.toFixed(0)} px · ~${(detection.landscapeWidthMm ?? 0).toFixed(1)} mm
          </span>
        </div>
        <div
          class="card-visual"
          id="card-visual"
          data-testid="card-visual"
          style="width: ${cardPx.width}px; height: ${cardPx.height}px;"
        ></div>
        <label class="field">PPI estimado: <output id="ppi-out">${c.ppi.toFixed(1)}</output>
          <input type="range" id="ppi-slider" min="280" max="560" step="0.5" value="${c.ppi}" />
        </label>
        <button type="button" class="btn btn--ghost btn--sm" id="btn-ppi-auto" ${c.ppiManual ? '' : 'hidden'}>
          Usar detección automática
        </button>
      </section>

      <section class="card">
        <h2>Separación entre ojos (IPD, mm)</h2>
        <p class="hint">Distancia habitual entre las pupilas. Si la deja en ~64 mm, cada ojo en el visor verá la escena como si mirara desde su posición real.</p>
        <label class="field">IPD
          <input type="range" id="ipd-slider" min="54" max="72" step="0.1" value="${c.ipdMm}" />
          <output id="ipd-out">${c.ipdMm}</output> mm (default Cardboard 63,9 mm)
        </label>
      </section>

      <section class="card" id="nonius-section">
        <h2>Alineación entre mitades (Nonius)</h2>
        <p class="hint">Desplaza el patrón hasta que las líneas de izquierda y derecha queden alineadas al colocar el celular en el visor; corrige pequeños desajustes mecánicos.</p>
        <div class="nonius-canvas-wrap">
          <canvas id="nonius-canvas" width="${Math.round(guideW)}" height="${NONIUS_HEIGHT}" aria-label="Patrón Nonius"></canvas>
        </div>
        <label class="field">Desplazamiento
          <input type="range" id="nonius-slider" min="-80" max="80" step="1" value="${c.noniusOffsetPx}" />
        </label>
      </section>

      <section class="card">
        <h2>Corrección de lentes (Brown-Conrady, Cardboard)</h2>
        <p class="hint">Las lentes del visor curvan la imagen; k1 y k2 la enderezan en el shader. Los valores por defecto suelen bastar; ajuste si ve bordes borrosos o doble contorno.</p>
        <label class="field">k1 <input type="range" id="k1" min="0" max="0.8" step="0.0001" value="${c.k1}" /></label>
        <label class="field">k2 <input type="range" id="k2" min="0" max="1.2" step="0.0001" value="${c.k2}" /></label>
        <canvas id="grid-preview" width="320" height="160" class="grid-preview"></canvas>
      </section>

      <section class="card ios-block" id="ios-gyro" hidden>
        <h2>Giroscopio (iOS Safari)</h2>
        <p class="hint">Safari exige un toque para leer el giroscopio: active aquí o al abrir un módulo. Sin él, puede arrastrar el dedo para mirar en el visor.</p>
        <button type="button" class="btn btn--primary" id="btn-gyro">Activar giroscopio</button>
        <p id="gyro-status" class="hint" aria-live="polite"></p>
      </section>

      <section class="card actions-row">
        <button type="button" class="btn btn--ghost" id="btn-back">Inicio</button>
        <button type="button" class="btn btn--primary" id="btn-save-enter">Guardar y continuar</button>
      </section>
    </main>
  `;

  if (DeviceOrientationController.needsPermission()) {
    root.querySelector('#ios-gyro').hidden = false;
  }

  const ppiSlider = root.querySelector('#ppi-slider');
  const cardVisual = root.querySelector('#card-visual');
  const ppiOut = root.querySelector('#ppi-out');
  const ppiAutoStatus = root.querySelector('#ppi-auto-status');
  const ppiCard = root.querySelector('#card-ppi');
  const btnPpiAuto = root.querySelector('#btn-ppi-auto');
  const screenGuide = root.querySelector('#screen-landscape-guide');
  const screenGuideLabel = root.querySelector('#screen-landscape-guide-label');
  const calibMain = root.querySelector('.screen--calibration');
  const noniusCanvas = root.querySelector('#nonius-canvas');
  const noniusSlider = root.querySelector('#nonius-slider');

  const drawNonius = () => {
    const w = noniusCanvas.width;
    const h = noniusCanvas.height;
    const ctx = noniusCanvas.getContext('2d');
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 8);
    ctx.lineTo(w / 2, h - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    const leftX = w / 4;
    const rightX = (3 * w) / 4;
    const ox = w / 2 + c.noniusOffsetPx;
    ctx.beginPath();
    ctx.moveTo(leftX, h * 0.28);
    ctx.lineTo(leftX, h * 0.72);
    ctx.moveTo(rightX, h * 0.28);
    ctx.lineTo(rightX, h * 0.72);
    ctx.stroke();
    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(ox - 40, h * 0.5);
    ctx.lineTo(ox + 40, h * 0.5);
    ctx.moveTo(ox, h * 0.32);
    ctx.lineTo(ox, h * 0.68);
    ctx.stroke();
  };

  const relayoutLandscapeGuides = () => {
    const det = detectScreenPpi();
    const guide = landscapeGuideWidthPx(det);
    const card = cardVisualSizePx(c.ppi);
    const { isLandscape: landscape } = getCalibrationViewport();

    screenGuide.style.width = `${guide}px`;
    screenGuideLabel.textContent = `Detector: ancho horizontal ${guide.toFixed(0)} px · ~${(det.landscapeWidthMm ?? 0).toFixed(1)} mm`;
    cardVisual.style.width = `${card.width}px`;
    cardVisual.style.height = `${card.height}px`;
    noniusCanvas.width = Math.round(guide);
    noniusCanvas.height = NONIUS_HEIGHT;
    calibMain.dataset.calibOrientation = landscape ? 'landscape' : 'portrait';
    drawNonius();
  };

  const syncPpiVisual = () => {
    ppiOut.textContent = c.ppi.toFixed(1);
    relayoutLandscapeGuides();
    ppiCard.dataset.ppiSource = c.ppiManual ? 'manual' : 'auto';
    ppiCard.dataset.ppiAuto = (c.ppiAuto ?? c.ppi).toFixed(1);
    if (c.ppiManual) {
      ppiAutoStatus.textContent = `Ajuste manual activo (${c.ppi.toFixed(1)} PPI). Puede volver a la detección automática.`;
      btnPpiAuto.hidden = false;
    } else {
      ppiAutoStatus.textContent = formatAutoPpiLabel(detectScreenPpi());
      btnPpiAuto.hidden = true;
    }
  };

  const onLayoutChange = () => relayoutLandscapeGuides();
  window.addEventListener('resize', onLayoutChange);
  window.addEventListener('orientationchange', onLayoutChange);
  layoutUnsub = () => {
    window.removeEventListener('resize', onLayoutChange);
    window.removeEventListener('orientationchange', onLayoutChange);
  };

  ppiSlider.oninput = () => {
    c.ppi = parseFloat(ppiSlider.value);
    c.ppiManual = true;
    syncPpiVisual();
  };

  btnPpiAuto.onclick = () => {
    const next = resetPpiToAuto();
    Object.assign(c, next);
    ppiSlider.value = String(c.ppi);
    syncPpiVisual();
  };

  const ipdSlider = root.querySelector('#ipd-slider');
  const ipdOut = root.querySelector('#ipd-out');
  ipdSlider.oninput = () => {
    c.ipdMm = parseFloat(ipdSlider.value);
    ipdOut.textContent = c.ipdMm.toFixed(1);
  };

  noniusSlider.oninput = () => {
    c.noniusOffsetPx = parseInt(noniusSlider.value, 10);
    drawNonius();
  };
  drawNonius();

  const gridCanvas = root.querySelector('#grid-preview');
  const k1El = root.querySelector('#k1');
  const k2El = root.querySelector('#k2');
  const drawGrid = () => {
    const ctx = gridCanvas.getContext('2d');
    const w = gridCanvas.width;
    const h = gridCanvas.height;
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#334155';
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * w;
      const y = (i / 10) * h;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.fillText(`k1=${c.k1.toFixed(4)} k2=${c.k2.toFixed(4)}`, 8, 14);
  };
  k1El.oninput = () => {
    c.k1 = parseFloat(k1El.value);
    drawGrid();
  };
  k2El.oninput = () => {
    c.k2 = parseFloat(k2El.value);
    drawGrid();
  };
  drawGrid();

  const gyroStatus = root.querySelector('#gyro-status');
  const stopGyroMonitor = () => {
    if (gyroMonitor) {
      clearInterval(gyroMonitor);
      gyroMonitor = null;
    }
    gyroCtrl?.dispose();
    gyroCtrl = null;
  };

  root.querySelector('#btn-gyro')?.addEventListener('click', () => {
    stopGyroMonitor();
    const permissionPromise = DeviceOrientationController.capturePermissionFromGesture();
    gyroCtrl = new DeviceOrientationController();
    void (async () => {
      const ok = await gyroCtrl.activate({ permissionPromise });
      if (ok) {
        c.gyroEnabled = true;
        gyroCtrl.recenter();
        gyroMonitor = setInterval(() => {
          const live = gyroCtrl.getLiveStatus();
          gyroStatus.textContent = live.text;
          gyroStatus.dataset.kind = live.kind;
        }, 150);
      } else {
        gyroStatus.textContent = 'Permiso denegado';
        gyroStatus.dataset.kind = 'denied';
      }
    })();
  });

  const leaveCalibration = () => {
    stopGyroMonitor();
    layoutUnsub?.();
    layoutUnsub = null;
  };

  root.querySelector('#btn-back').onclick = () => {
    leaveCalibration();
    onNavigate('home');
  };
  root.querySelector('#btn-save-enter').onclick = () => {
    leaveCalibration();
    saveCalibration(c);
    onNavigate('modules', { calibration: c, mode: state.mode || 'cardboard' });
  };
}