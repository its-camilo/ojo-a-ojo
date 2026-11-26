import { ViewerSession, MODULE_IDS } from '../../viewer/ViewerSession.js';
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
  const mode = state.mode || 'desktop';

  const showHub = () => {
    viewer?.dispose();
    viewer = null;
    setState({ viewerActive: false });
    root.innerHTML = `
      <main class="screen screen--modules">
        <header>
          <h1>Pruebas 3D en el visor</h1>
          <p class="disclaimer-inline">Tamizaje exploratorio — no diagnóstico clínico.</p>
          <div class="toolbar">
            <label>Modo vista
              <select id="view-mode">
                <option value="0">Estéreo SBS + barril</option>
                <option value="1">Estéreo SBS sin distorsión</option>
                <option value="2">Monocular (depuración)</option>
              </select>
            </label>
            ${mode === 'cardboard' ? '<button type="button" class="btn btn--primary" id="countdown">Entrar al visor (3 s)</button>' : ''}
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
      btn.onclick = () => launchModule(btn.dataset.module);
    });
    root.querySelector('#btn-seq')?.addEventListener('click', () => runSequence(0));
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
    launchModule(MODULE_IDS[index]);
  };

  const launchModule = (moduleId) => {
    const viewMode = parseInt(root.querySelector('#view-mode')?.value ?? state.viewMode ?? 0, 10);
    root.innerHTML = `
      <div class="viewer-shell" style="height:100dvh;width:100vw;">
        <div id="viewer-mount" class="viewer-mount" tabindex="0"></div>
        <div class="viewer-hud">
          <p class="disclaimer-inline">Mirada central ~1,5 s · clic/toque/Enter alternativo</p>
          <button type="button" class="btn btn--ghost" id="exit-viewer">Salir del módulo</button>
        </div>
        <div class="reticle-hud" aria-hidden="true"><div class="reticle-hud__ring"></div></div>
      </div>
    `;
    const mount = root.querySelector('#viewer-mount');
    setState({ viewerActive: true });
    viewer?.dispose();
    viewer = new ViewerSession(mount, { calibration: cal, viewMode, mode });
    viewer.stereo.setViewMode(viewMode);
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