import { appState, finishSession } from '../../app/state.js';
import { clearSessionResults, loadSessionResults } from '../../utils/storage.js';

export const MODULE_LABELS = {
  balance: 'Balance dicóptico 3D',
  'hollow-mask': 'Máscara hueca 3D',
  ames: 'Cuarto de Ames 3D',
  rds: 'RDS 3D grueso (Julesz)',
};

const MODULE_ORDER = ['balance', 'hollow-mask', 'ames', 'rds'];

export function renderSummary(root, { onNavigate }) {
  const stored = loadSessionResults();
  if (stored?.modules) {
    appState.session = {
      ...appState.session,
      ...stored,
      modules: { ...appState.session.modules, ...stored.modules },
    };
  }
  finishSession();
  const mods = appState.session.modules || {};

  const rows = MODULE_ORDER.map((id) => {
    const m = mods[id];
    const title = MODULE_LABELS[id];
    if (!m) {
      return `<tr><td>${title}</td><td colspan="2"><em>No realizado</em></td></tr>`;
    }
    return `<tr>
      <td>${title}</td>
      <td class="metrics-cell">${escapeHtml(formatMetricsHuman(id, m))}</td>
      <td>${escapeHtml(m.interpretation || '—')}</td>
    </tr>`;
  }).join('');

  root.innerHTML = `
    <main class="screen screen--summary">
      <header>
        <h1>Resumen de tamizaje</h1>
        <p class="lead">Cuatro módulos en un solo vistazo. Exporte los datos JSON o repita la sesión para comparar.</p>
      </header>
      <section class="card">
        <h2>Patrón de los 4 módulos</h2>
        <table class="summary-table" data-testid="summary-table">
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
    onNavigate('modules', { mode: 'cardboard' });
  };
  root.querySelector('#btn-home').onclick = () => onNavigate('home');
}

function formatMetricsHuman(id, m) {
  const fmtNum = (n, d = 2) =>
    typeof n === 'number' && Number.isFinite(n) ? n.toFixed(d).replace('.', ',') : '—';

  switch (id) {
    case 'balance':
      return `Razón de balance: ${fmtNum(m.imbalanceRatio)} (${m.trials ?? '—'} ensayos, ${m.reversals ?? '—'} reversiones)`;
    case 'hollow-mask':
      return `Monocular: ${labelPercept(m.monoPercept)} · Estéreo: ${labelPercept(m.stereoPercept)}`;
    case 'ames':
      return `Monocular: ${labelJudge(m.monoJudgment)} · Estéreo: ${labelJudge(m.stereoJudgment)}`;
    case 'rds': {
      const arc =
        typeof m.disparityArcsec === 'number' && Number.isFinite(m.disparityArcsec)
          ? Math.round(m.disparityArcsec)
          : '—';
      return `Disparidad: ${m.disparityPx ?? '—'} px (~${arc}″) · Mono: ${labelDepth(m.monoDepth)} · Estéreo: ${labelDepth(m.stereoDepth)}`;
    }
    default:
      return '—';
  }
}

function labelPercept(p) {
  if (p === 'convex') return 'convexa';
  if (p === 'concave') return 'cóncava';
  return p ?? '—';
}

function labelJudge(j) {
  if (j === 'left') return 'izquierda más grande';
  if (j === 'right') return 'derecha más grande';
  if (j === 'equal') return 'iguales';
  return j ?? '—';
}

function labelDepth(d) {
  if (d === 'near') return 'adelante';
  if (d === 'far') return 'atrás';
  if (d === 'none') return 'no veo figura';
  return d ?? '—';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function drawCrossPattern(el, mods) {
  const items = [
    {
      id: 'balance',
      label: MODULE_LABELS.balance,
      ok: mods.balance && (mods.balance.imbalanceRatio != null || mods.balance.valid != null),
    },
    {
      id: 'hollow-mask',
      label: MODULE_LABELS['hollow-mask'],
      ok: Boolean(mods['hollow-mask']?.stereoPercept || mods['hollow-mask']?.monoPercept),
    },
    {
      id: 'ames',
      label: MODULE_LABELS.ames,
      ok: Boolean(mods.ames?.stereoJudgment),
    },
    {
      id: 'rds',
      label: MODULE_LABELS.rds,
      ok: Boolean(mods.rds?.stereoDepth),
    },
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
    <p class="hint">Valore el patrón entre módulos en conjunto (por ejemplo, dificultad en RDS y desequilibrio marcado en balance), no una sola prueba aislada. Véase Webber et al. (2020) sobre supresión y estereopsis.</p>
  `;
}