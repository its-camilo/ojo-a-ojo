import { ViewerSession, MODULE_IDS } from '../../viewer/ViewerSession.js';
import { DeviceOrientationController } from '../../viewer/DeviceOrientation.js';
import { setState } from '../../app/state.js';

const MODULE_META = [
  { id: 'balance', n: 1, title: 'Balance dicóptico 3D', desc: 'Supresión / dominancia (Martín et al., 2020)' },
  { id: 'hollow-mask', n: 2, title: 'Máscara hueca 3D', desc: 'Disparidad vs prior convexidad (Hill & Bruce, 1993)' },
  { id: 'ames', n: 3, title: 'Cuarto de Ames 3D', desc: 'Perspectiva vs estereopsis (Gehringer & Engel, 1986)' },
  { id: 'rds', n: 4, title: 'RDS 3D grueso', desc: 'Estereopsis global (Julesz, 1960; Bonfanti et al., 2015)' },
];

export function renderModules(root, state, { onNavigate }) {
  let viewer = null;
  const cal = state.calibration;
  const mode = state.mode || 'cardboard';

  const showHub = () => {
    viewer?.dispose();
    viewer = null;
    setState({ viewerActive: false });
    root.innerHTML = `
      <main class="screen screen--modules">
        <header>
          <h1>Pruebas 3D en el visor</h1>
          <p class="lead">Coloque el teléfono en el Cardboard y mire al centro del visor para elegir con ~1,5 s de fijación; también puede tocar o pulsar Enter.</p>
          <div class="toolbar">
            <label>Modo vista
              <select id="view-mode">
                <option value="0">Estéreo SBS + barril</option>
                <option value="1">Estéreo SBS sin distorsión</option>
                <option value="2">Monocular (depuración)</option>
              </select>
            </label>
            <button type="button" class="btn btn--primary" id="countdown">Entrar al visor (3 s)</button>
          </div>
        </header>
        <ol class="module-list">
          ${MODULE_META.map(
            (m) => `
            <li class="card module-card">
              <h2>Módulo ${m.n}: ${m.title}</h2>
              <p>${m.desc}</p>
              <button type="button" class="btn btn--primary" data-module="${m.id}">Abrir módulo</button>
            </li>`
          ).join('')}
        </ol>
        <div class="actions-row">
          <button type="button" class="btn btn--ghost" id="btn-calib">Calibración</button>
          <button type="button" class="btn btn--ghost" id="btn-seq">Recorrido secuencial</button>
          <button type="button" class="btn btn--secondary" id="btn-summary">Finalizar y ver resumen</button>
        </div>
      </main>
    `;

    root.querySelector('#btn-calib').onclick = () => onNavigate('calibration', { mode });
    root.querySelector('#btn-summary').onclick = () => onNavigate('summary');
    root.querySelectorAll('[data-module]').forEach((btn) => {
      btn.onclick = () => beginModuleFromGesture(btn.dataset.module);
    });
    root.querySelector('#btn-seq')?.addEventListener('click', () => beginModuleFromGesture(MODULE_IDS[0], 0));
    root.querySelector('#countdown')?.addEventListener('click', () => {
      let n = 3;
      const btn = root.querySelector('#countdown');
      btn.disabled = true;
      const tick = () => {
        btn.textContent = n > 0 ? `Coloque el celular… ${n}` : 'Listo';
        if (n-- > 0) setTimeout(tick, 1000);
        else btn.disabled = false;
      };
      tick();
    });
  };

  let sequenceIndex = null;

  const runSequence = (index = 0) => {
    sequenceIndex = index;
    if (index >= MODULE_IDS.length) {
      sequenceIndex = null;
      onNavigate('summary');
      return;
    }
    beginModuleFromGesture(MODULE_IDS[index], index);
  };

  const beginModuleFromGesture = (moduleId, seqIndex = null) => {
    const permissionPromise = DeviceOrientationController.capturePermissionFromGesture();
    if (seqIndex !== null) sequenceIndex = seqIndex;
    void launchModule(moduleId, { permissionPromise });
  };

  const launchModule = async (moduleId, { permissionPromise = null } = {}) => {
    const viewMode = parseInt(root.querySelector('#view-mode')?.value ?? state.viewMode ?? 0, 10);
    root.innerHTML = `
      <div class="viewer-shell" style="height:100dvh;width:100vw;">
        <div id="viewer-mount" class="viewer-mount" tabindex="0"></div>
        <div id="gyro-overlay" class="gyro-overlay" hidden>
          <p id="gyro-overlay-msg">Tocar para activar giroscopio</p>
          <button type="button" class="btn btn--primary" id="btn-activate-gyro">Tocar para activar giroscopio</button>
        </div>
        <div class="viewer-hud">
          <button type="button" id="btn-recenter" class="btn btn--ghost btn--sm">Recentrar</button>
          <button type="button" class="btn btn--ghost" id="exit-viewer">Salir del módulo</button>
        </div>
      </div>
    `;

    const overlay = root.querySelector('#gyro-overlay');
    const overlayMsg = root.querySelector('#gyro-overlay-msg');
    const btnActivateGyro = root.querySelector('#btn-activate-gyro');
    const btnRecenter = root.querySelector('#btn-recenter');

    const mount = root.querySelector('#viewer-mount');
    setState({ viewerActive: true });
    viewer?.dispose();

    viewer = new ViewerSession(mount, {
      calibration: cal,
      viewMode,
      mode,
      onGyroOverlayNeeded: (reason) => {
        overlay.hidden = false;
        overlayMsg.textContent =
          reason === 'permission'
            ? 'Se necesita permiso de giroscopio para mover la vista.'
            : 'No hay señal del giroscopio — puede arrastrar con el dedo o toque abajo.';
      },
    });

    if (typeof window !== 'undefined' && window.__OJO_A_OJO__) {
      window.__OJO_A_OJO__.viewerSession = viewer;
    }

    viewer.stereo.setViewMode(viewMode);

    const gyroOpts = {
      permissionPromise,
      assumeGranted: Boolean(cal.gyroEnabled),
    };
    const activated = await viewer.activateGyro(gyroOpts);
    if (activated) {
      overlay.hidden = true;
    }

    btnActivateGyro.onclick = () => {
      const perm = DeviceOrientationController.capturePermissionFromGesture();
      void (async () => {
        const ok = await viewer.activateGyro({ permissionPromise: perm, assumeGranted: true });
        if (ok) overlay.hidden = true;
      })();
    };

    const onRecenter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      viewer.recenterGyro();
    };
    btnRecenter.addEventListener('pointerdown', onRecenter);
    btnRecenter.addEventListener('click', (e) => e.stopPropagation());

    viewer.startModule(moduleId, () => {
      if (sequenceIndex !== null) {
        runSequence(sequenceIndex + 1);
      } else {
        showHub();
      }
    });

    root.querySelector('#exit-viewer').onclick = () => {
      sequenceIndex = null;
      showHub();
    };
    mount.focus();
  };

  showHub();
}