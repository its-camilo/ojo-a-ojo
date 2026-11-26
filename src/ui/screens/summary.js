import { appState, finishSession } from '../../app/state.js';
import { clearSessionResults } from '../../utils/storage.js';

export function renderSummary(root, { onNavigate }) {
  finishSession();
  const mods = appState.session.modules || {};
  const keys = ['balance', 'hollow-mask', 'ames', 'rds'];

  const rows = keys
    .map((id) => {
      const m = mods[id];
      if (!m) return `<tr><td>${id}</td><td colspan="2"><em>No realizado</em></td></tr>`;
      return `<tr>
        <td>${m.title || id}</td>
        <td><pre class="metrics-json">${escapeHtml(JSON.stringify(m, null, 0))}</pre></td>
        <td>${escapeHtml(m.interpretation || '—')}</td>
      </tr>`;
    })
    .join('');

  root.innerHTML = `
    <main class="screen screen--summary">
      <header>
        <h1>Resumen de tamizaje</h1>
        <p class="disclaimer-inline">
          <strong>Prototipo académico.</strong> Patrón cruzado entre módulos; no constituye diagnóstico médico.
          Ante indicios, consulte optometría u oftalmología.
        </p>
      </header>
      <section class="card">
        <h2>Patrón de los 4 módulos</h2>
        <table class="summary-table">
          <thead><tr><th>Módulo</th><th>Métricas</th><th>Interpretación prudente</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
      <section class="card cross-pattern" id="cross-pattern" aria-label="Vista cruzada"></section>
      <section class="card actions-row">
        <button type="button" class="btn btn--primary" id="btn-export">Exportar JSON</button>
        <button type="button" class="btn btn--ghost" id="btn-repeat">Repetir sesión</button>
        <button type="button" class="btn btn--ghost" id="btn-home">Inicio</button>
      </section>
    </main>
  `;

  drawCrossPattern(root.querySelector('#cross-pattern'), mods);

  root.querySelector('#btn-export').onclick = () => {
    const blob = new Blob([JSON.stringify(appState.session, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ojo-a-ojo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  root.querySelector('#btn-repeat').onclick = () => {
    clearSessionResults();
    appState.session = { modules: {}, startedAt: null, finishedAt: null };
    onNavigate('modules', { mode: 'desktop' });
  };
  root.querySelector('#btn-home').onclick = () => onNavigate('home');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function drawCrossPattern(el, mods) {
  const items = [
    { id: 'balance', label: 'Balance', ok: mods.balance?.valid || mods.balance?.imbalanceRatio },
    { id: 'hollow-mask', label: 'Hollow', ok: mods['hollow-mask']?.stereoPercept },
    { id: 'ames', label: 'Ames', ok: mods.ames?.stereoJudgment },
    { id: 'rds', label: 'RDS', ok: mods.rds?.stereoDepth && mods.rds.stereoDepth !== 'none' },
  ];
  el.innerHTML = `
    <div class="cross-grid">
      ${items
        .map(
          (i) => `<div class="cross-cell ${i.ok ? 'cross-cell--ok' : 'cross-cell--pending'}">
            <span>${i.label}</span>
            <small>${i.ok ? 'dato registrado' : 'pendiente / sin fusión'}</small>
          </div>`
        )
        .join('')}
    </div>
    <p class="hint">Valore conjuntamente: p. ej. RDS ausente + balance muy desviado → indício de consulta; no una sola métrica aislada (Webber et al., 2020; dossier §6).</p>
  `;
}