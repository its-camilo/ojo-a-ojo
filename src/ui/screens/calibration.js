import { saveCalibration, DEFAULT_CALIBRATION } from '../../utils/storage.js';
import { DeviceOrientationController } from '../../viewer/DeviceOrientation.js';

const CARD_W_MM = 85.6;
const CARD_H_MM = 53.98;

export function renderCalibration(root, state, { onNavigate }) {
  const c = { ...state.calibration };
  root.innerHTML = `
    <main class="screen screen--calibration">
      <header>
        <h1>Calibración en pantalla normal</h1>
        <p class="lead">Persistida en localStorage. Realice este paso <strong>antes</strong> de colocar el celular en el visor.</p>
        <p class="disclaimer-inline">Prototipo de tamizaje — no diagnóstico clínico.</p>
      </header>

      <section class="card" id="card-ppi">
        <h2>PPI con tarjeta bancaria (ISO 7810: ${CARD_W_MM}×${CARD_H_MM} mm, Li et al., 2020)</h2>
        <p>Ajuste el ancho del rectángulo hasta que coincida con su tarjeta.</p>
        <div class="card-visual" id="card-visual" style="width: ${(CARD_W_MM / 25.4) * c.ppi}px; height: ${(CARD_H_MM / 25.4) * c.ppi}px;"></div>
        <label class="field">PPI estimado: <output id="ppi-out">${c.ppi.toFixed(1)}</output>
          <input type="range" id="ppi-slider" min="280" max="560" step="0.5" value="${c.ppi}" />
        </label>
      </section>

      <section class="card">
        <h2>Separación virtual (IPD, mm)</h2>
        <label class="field">IPD
          <input type="range" id="ipd-slider" min="54" max="72" step="0.1" value="${c.ipdMm}" />
          <output id="ipd-out">${c.ipdMm}</output> mm (default Cardboard 63,9 mm)
        </label>
      </section>

      <section class="card" id="nonius-section">
        <h2>Patrón Nonius (alineación dicóptica)</h2>
        <div class="nonius-canvas-wrap">
          <canvas id="nonius-canvas" width="640" height="200" aria-label="Patrón Nonius"></canvas>
        </div>
        <label class="field">Desplazamiento
          <input type="range" id="nonius-slider" min="-80" max="80" step="1" value="${c.noniusOffsetPx}" />
        </label>
      </section>

      <section class="card">
        <h2>Distorsión de lentes (Brown-Conrady, Google Cardboard)</h2>
        <p>k1 default 0,33582564 · k2 default 0,55348791 — calibrables.</p>
        <label class="field">k1 <input type="range" id="k1" min="0" max="0.8" step="0.0001" value="${c.k1}" /></label>
        <label class="field">k2 <input type="range" id="k2" min="0" max="1.2" step="0.0001" value="${c.k2}" /></label>
        <canvas id="grid-preview" width="320" height="160" class="grid-preview"></canvas>
      </section>

      <section class="card ios-block" id="ios-gyro" hidden>
        <h2>Giroscopio (iOS Safari)</h2>
        <button type="button" class="btn btn--primary" id="btn-gyro">Activar giroscopio</button>
        <p id="gyro-status" class="hint"></p>
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
  ppiSlider.oninput = () => {
    c.ppi = parseFloat(ppiSlider.value);
    ppiOut.textContent = c.ppi.toFixed(1);
    cardVisual.style.width = `${(CARD_W_MM / 25.4) * c.ppi}px`;
    cardVisual.style.height = `${(CARD_H_MM / 25.4) * c.ppi}px`;
  };

  const ipdSlider = root.querySelector('#ipd-slider');
  const ipdOut = root.querySelector('#ipd-out');
  ipdSlider.oninput = () => {
    c.ipdMm = parseFloat(ipdSlider.value);
    ipdOut.textContent = c.ipdMm.toFixed(1);
  };

  const noniusCanvas = root.querySelector('#nonius-canvas');
  const noniusSlider = root.querySelector('#nonius-slider');
  const drawNonius = () => {
    const ctx = noniusCanvas.getContext('2d');
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, 640, 200);
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    const ox = 320 + c.noniusOffsetPx;
    ctx.beginPath();
    ctx.moveTo(160, 60);
    ctx.lineTo(160, 140);
    ctx.moveTo(480, 60);
    ctx.lineTo(480, 140);
    ctx.stroke();
    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(ox - 40, 100);
    ctx.lineTo(ox + 40, 100);
    ctx.moveTo(ox, 70);
    ctx.lineTo(ox, 130);
    ctx.stroke();
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

  root.querySelector('#btn-gyro')?.addEventListener('click', async () => {
    const ctrl = new DeviceOrientationController();
    const ok = await ctrl.requestPermission();
    root.querySelector('#gyro-status').textContent = ok
      ? 'Giroscopio autorizado. Puede entrar al visor.'
      : 'Permiso denegado. Use modo escritorio o reintente.';
    if (ok) c.gyroEnabled = true;
    ctrl.dispose();
  });

  root.querySelector('#btn-back').onclick = () => onNavigate('home');
  root.querySelector('#btn-save-enter').onclick = () => {
    saveCalibration(c);
    onNavigate('modules', { calibration: c, mode: state.mode || 'desktop' });
  };
}