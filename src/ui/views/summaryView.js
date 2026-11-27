import { appState, finishSession, mergeSessionFromPersistence } from '../../domain/sessionState.js';
import { clearSessionResults } from '../../services/storage.js';

export const MODULE_LABELS = {
  balance: 'Balance dicóptico 3D',
  'hollow-mask': 'Máscara hueca 3D',
  ames: 'Cuarto de Ames 3D',
  rds: 'RDS 3D grueso (Julesz)',
};

const MODULE_ORDER = ['balance', 'hollow-mask', 'ames', 'rds'];

function hasModuleRecord(m, id) {
  if (!m) return false;
  switch (id) {
    case 'balance':
      return m.imbalanceRatio != null || m.valid != null;
    case 'hollow-mask':
      return Boolean(m.monoPercept || m.stereoPercept);
    case 'ames':
      return Boolean(m.monoJudgment || m.stereoJudgment);
    case 'rds':
      return Boolean(m.monoDepth || m.stereoDepth);
    default:
      return false;
  }
}

function isStereoComplete(m, id) {
  if (!m) return false;
  switch (id) {
    case 'hollow-mask':
      return Boolean(m.stereoPercept);
    case 'ames':
      return Boolean(m.stereoJudgment);
    case 'rds':
      return Boolean(m.stereoDepth);
    default:
      return true;
  }
}

const MODULE_BRIEF = {
  balance:
    'Compara qué tan claros ves los objetos de cada ojo cuando cada mitad de pantalla va a un ojo distinto.',
  'hollow-mask':
    'Pone a prueba si la forma de una máscara hueca la ves convexa (saliendo) o cóncava (entrando).',
  ames:
    'Observa si el tamaño percibido de dos figuras en un cuarto trapezoidal cambia con un ojo o con los dos.',
  rds:
    'Busca si logras fusionar puntos aleatorios con disparidad binocular para ver una figura en relieve.',
};

export function renderSummary(root, { onNavigate }) {
  mergeSessionFromPersistence();
  finishSession();
  const mods = appState.session.modules || {};
  const overall = buildOverallNarrative(mods);

  const cards = MODULE_ORDER.map((id) => {
    const m = mods[id];
    const title = MODULE_LABELS[id];
    if (!hasModuleRecord(m, id)) {
      return `<article class="summary-module-card summary-module-card--pending" data-testid="summary-card-${id}">
        <h3>${title}</h3>
        <p class="summary-module-card__purpose">${MODULE_BRIEF[id]}</p>
        <p><em>No realizado en esta sesión.</em></p>
      </article>`;
    }
    const partial = Boolean(m.partial) || !isStereoComplete(m, id);
    const partialNote = partial
      ? '<p class="summary-partial-note"><em>Ronda 2/2 (Dos ojos) pendiente — registrado solo 1/2 Un ojo.</em></p>'
      : '';
    const metrics = formatMetricsHuman(id, m);
    const plain = explainResultPlain(id, m);
  const partialClass = partial ? ' summary-module-card--partial' : '';
    return `<article class="summary-module-card${partialClass}" data-testid="summary-card-${id}">
      <h3>${title}</h3>
      <p class="summary-module-card__purpose"><strong>Qué evaluó:</strong> ${MODULE_BRIEF[id]}</p>
      <p class="metrics-cell" data-testid="summary-metrics-${id}"><strong>Tu resultado:</strong> ${escapeHtml(metrics)}</p>
      ${partialNote}
      <p class="summary-module-card__interp"><strong>Cómo leerlo:</strong> ${escapeHtml(plain)}</p>
    </article>`;
  }).join('');

  root.innerHTML = `
    <main class="screen screen--summary">
      <header>
        <h1>Resumen de tamizaje</h1>
        <p class="lead">
          <strong>Tamizaje exploratorio orientativo</strong> — no es un diagnóstico clínico ni sustituye una evaluación oftalmológica.
        </p>
        <p class="summary-global" data-testid="summary-global">${escapeHtml(overall)}</p>
      </header>
      <section class="summary-modules" data-testid="summary-table" aria-label="Resultados por módulo">
        ${cards}
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

function buildOverallNarrative(mods) {
  const parts = [];
  const balance = mods.balance;
  if (balance?.imbalanceRatio != null) {
    parts.push(balanceDominanceSentence(balance.imbalanceRatio));
  }
  const hm = mods['hollow-mask'];
  if (hm?.stereoPercept) {
    if (hm.stereoPercept === 'concave') parts.push('En la máscara hueca hubo señal de uso de profundidad binocular.');
    else if (hm.monoPercept === 'convex' && hm.stereoPercept === 'convex') {
      parts.push('La máscara hueca mantuvo aspecto convexa (patrón habitual de la ilusión).');
    }
  } else if (hm?.monoPercept) {
    parts.push('Máscara hueca: solo ronda 1/2 (Un ojo) guardada; falta Dos ojos.');
  }
  const ames = mods.ames;
  if (ames?.stereoJudgment) {
    if (ames.monoJudgment && ames.monoJudgment !== ames.stereoJudgment) {
      parts.push('El Cuarto de Ames cambió entre visión con un ojo y con ambos (pista de corrección estéreo).');
    }
  } else if (ames?.monoJudgment) {
    parts.push('Cuarto de Ames: solo ronda 1/2 registrada.');
  }
  const rds = mods.rds;
  if (rds?.stereoDepth) {
    if (rds.stereoDepth === 'near' || rds.stereoDepth === 'far') {
      parts.push('En RDS 3D reportó relieve con fusión binocular.');
    } else if (rds.stereoDepth === 'none') {
      parts.push('En RDS 3D no logró ver la figura en relieve con ambos ojos.');
    }
  } else if (rds?.monoDepth) {
    parts.push('RDS: solo ronda 1/2 (Un ojo) guardada.');
  }
  if (parts.length === 0) {
    return 'Complete los cuatro módulos en el visor para obtener un resumen global en lenguaje sencillo.';
  }
  return `${parts.join(' ')} Revise cada tarjeta abajo para el detalle numérico.`;
}

/** IR ≈ contraste relativo del ojo izquierdo; <1 refuerza izquierdo → predominancia del derecho, >1 al revés. */
function balanceDominanceEye(ir) {
  if (typeof ir !== 'number' || !Number.isFinite(ir)) return null;
  if (ir >= 0.85 && ir <= 1.15) return 'balanced';
  if (ir < 0.85) return 'right';
  return 'left';
}

function balanceDominanceSentence(ir) {
  const eye = balanceDominanceEye(ir);
  if (eye === null) return 'El balance dicóptico quedó registrado sin un índice numérico claro.';
  if (eye === 'balanced') return 'El balance dicóptico se acercó a un equilibrio entre ojos.';
  if (eye === 'right') {
    return 'El balance sugiere posible predominancia del ojo derecho en contraste percibido (el ojo izquierdo necesitó más refuerzo para parecerte igual).';
  }
  return 'El balance sugiere posible predominancia del ojo izquierdo en contraste percibido (la razón medida quedó por encima de 1).';
}

function balanceCardInterpretation(ir) {
  const eye = balanceDominanceEye(ir);
  if (eye === null) return 'Sin dato numérico claro para interpretar el balance.';
  if (eye === 'balanced') {
    return 'Valores cercanos a 1 indican equilibrio relativo entre ojos en esta prueba exploratoria.';
  }
  if (eye === 'right') {
    return 'Por debajo de 1, el ojo izquierdo necesitó más contraste para parecerte igual — posible predominancia del ojo derecho.';
  }
  return 'Por encima de 1 en la razón de balance — posible predominancia del ojo izquierdo en contraste percibido.';
}

function explainResultPlain(id, m) {
  switch (id) {
    case 'balance': {
      const ir = m.imbalanceRatio;
      if (typeof ir !== 'number' || !Number.isFinite(ir)) return m.interpretation || 'Sin dato numérico.';
      return balanceCardInterpretation(ir);
    }
    case 'hollow-mask': {
      if (m.partial || !m.stereoPercept) {
        return `Monocular (1/2): ${labelPercept(m.monoPercept)} · Estéreo (2/2): pendiente`;
      }
      const mono = labelPercept(m.monoPercept);
      const stereo = labelPercept(m.stereoPercept);
      if (mono === 'convexa' && stereo === 'cóncava') {
        return 'Pasó de convexa con un ojo a cóncava con dos: la disparidad ayudó a ver el hueco real.';
      }
      if (stereo === 'convexa') {
        return 'Siguió viendo la máscara como saliente; es lo habitual sin disparidad fuerte.';
      }
      return `Monocular: ${mono}; estéreo: ${stereo}. Compare si cambió al fusionar ambos ojos.`;
    }
    case 'ames': {
      if (m.partial || !m.stereoJudgment) {
        return `Monocular (1/2): ${labelJudge(m.monoJudgment)} · Estéreo (2/2): pendiente`;
      }
      const mono = labelJudge(m.monoJudgment);
      const stereo = labelJudge(m.stereoJudgment);
      if (mono !== stereo) {
        return `Con un ojo eligió «${mono}» y con dos ojos «${stereo}»: la estereopsis pudo corregir la ilusión de tamaño.`;
      }
      return `Con uno y dos ojos reportó «${stereo}». La perspectiva del cuarto siguió dominando por igual.`;
    }
    case 'rds': {
      const sd = labelDepth(m.stereoDepth);
      const md = labelDepth(m.monoDepth);
      if (m.stereoDepth === 'none') {
        return 'No fusionó la figura en relieve solo con estereopsis — puede indicar dificultad binocular a esta disparidad gruesa.';
      }
      if (m.stereoDepth === 'near') {
        return `Vio la figura saliendo hacia usted (${sd}) con ambos ojos; monocular: ${md}.`;
      }
      if (m.stereoDepth === 'far') {
        return `La figura pareció hundirse (${sd}) con fusión binocular.`;
      }
      return m.interpretation || '—';
    }
    default:
      return m.interpretation || '—';
  }
}

function formatMetricsHuman(id, m) {
  const fmtNum = (n, d = 2) =>
    typeof n === 'number' && Number.isFinite(n) ? n.toFixed(d).replace('.', ',') : '—';

  switch (id) {
    case 'balance':
      return `Razón de balance: ${fmtNum(m.imbalanceRatio)} (${m.trials ?? '—'} ensayos, ${m.reversals ?? '—'} reversiones)`;
    case 'hollow-mask':
      if (!m.stereoPercept) {
        return `Monocular: ${labelPercept(m.monoPercept)} · Estéreo: pendiente (complete 2/2 Dos ojos)`;
      }
      return `Monocular: ${labelPercept(m.monoPercept)} · Estéreo: ${labelPercept(m.stereoPercept)}`;
    case 'ames':
      if (!m.stereoJudgment) {
        return `Monocular: ${labelJudge(m.monoJudgment)} · Estéreo: pendiente (complete 2/2 Dos ojos)`;
      }
      return `Monocular: ${labelJudge(m.monoJudgment)} · Estéreo: ${labelJudge(m.stereoJudgment)}`;
    case 'rds': {
      const arc =
        typeof m.disparityArcsec === 'number' && Number.isFinite(m.disparityArcsec)
          ? Math.round(m.disparityArcsec)
          : '—';
      if (m.partial || !m.stereoDepth) {
        return `Disparidad: ${m.disparityPx ?? '—'} px · Mono (1/2): ${labelDepth(m.monoDepth)} · Estéreo (2/2): pendiente`;
      }
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
  const items = MODULE_ORDER.map((id) => {
    const m = mods[id];
    const recorded = hasModuleRecord(m, id);
    const full = recorded && isStereoComplete(m, id);
    return {
      id,
      label: MODULE_LABELS[id],
      recorded,
      full,
    };
  });
  el.innerHTML = `
    <h2>Patrón entre pruebas</h2>
    <div class="cross-grid">
      ${items
        .map((i) => {
          const cls = i.full ? 'cross-cell--ok' : i.recorded ? 'cross-cell--partial' : 'cross-cell--pending';
          const note = i.full
            ? 'dato registrado'
            : i.recorded
              ? 'solo ronda 1/2 — falta Dos ojos'
              : 'pendiente / sin fusión';
          return `<div class="cross-cell ${cls}">
            <span>${i.label}</span>
            <small>${note}</small>
          </div>`;
        })
        .join('')}
    </div>
    <p class="hint">Mire el conjunto: por ejemplo, dificultad en RDS y desequilibrio marcado en balance pueden ir de la mano. No decida solo con una prueba.</p>
  `;
}