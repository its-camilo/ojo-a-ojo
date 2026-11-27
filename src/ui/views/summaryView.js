import { appState, finishSession, mergeSessionFromPersistence } from '../../domain/sessionState.js';
import { clearSessionResults } from '../../services/storage.js';

export const MODULE_LABELS = {
  balance: 'Balance dicóptico 3D',
  'hollow-mask': 'Máscara hueca 3D',
  ames: 'Cuarto de Ames 3D',
  rds: 'RDS 3D grueso (Julesz)',
};

const MODULE_ORDER = ['balance', 'hollow-mask', 'ames', 'rds'];

const MODULE_DISPLAY = {
  balance: {
    index: 1,
    everydayTitle: '¿Un ojo trabaja más que el otro?',
    about:
      'La pantalla se dividió en dos: cada ojo veía un lado distinto. El objetivo era igualar el brillo o contraste hasta que ambos lados se vieran igual de claros para ti.',
  },
  'hollow-mask': {
    index: 2,
    everydayTitle: '¿Ves el hueco real o el cerebro te engaña?',
    about:
      'Viste la forma de una máscara de cara, primero con un ojo y después con los dos. La pregunta era si la percibías como un relieve saliendo hacia ti o como un hueco hacia adentro.',
  },
  ames: {
    index: 3,
    everydayTitle: '¿Tu vista 3D vence la ilusión de tamaño?',
    about:
      'Dos figuras en un cuarto en forma de trapecio suelen parecer de distinto tamaño aunque no lo sean. Comparaste qué figura te parecía más grande con un ojo y con los dos.',
  },
  rds: {
    index: 4,
    everydayTitle: '¿Logras ver una figura escondida en 3D?',
    about:
      'Patrones de puntos aleatorios ocultan una figura que solo aparece cuando ambos ojos combinan la imagen y el cerebro recupera la profundidad.',
  },
};

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

export function renderSummary(root, { onNavigate }) {
  mergeSessionFromPersistence();
  finishSession();
  const mods = appState.session.modules || {};
  const overall = buildOverallNarrative(mods);

  const cards = MODULE_ORDER.map((id) => buildModuleCard(id, mods[id])).join('');

  root.innerHTML = `
    <main class="screen screen--summary">
      <header class="summary-header">
        <h1>Resumen de tamizaje</h1>
        <p class="lead">
          <strong>Prueba exploratoria orientativa</strong> — no es un diagnóstico médico ni sustituye una valoración con optómetra u oftalmólogo.
        </p>
        <section class="summary-highlight" aria-label="Síntesis en lenguaje sencillo">
          <h2 class="summary-highlight__title">Qué dicen tus pruebas en palabras sencillas</h2>
          <p class="summary-global" data-testid="summary-global">${escapeHtml(overall)}</p>
        </section>
      </header>
      <section class="summary-modules" data-testid="summary-table" aria-label="Resultados por módulo">
        ${cards}
      </section>
      <section class="card cross-pattern" id="cross-pattern" aria-label="Cómo se conectan las pruebas"></section>
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

function buildModuleCard(id, m) {
  const display = MODULE_DISPLAY[id];
  const illusion = MODULE_LABELS[id];
  if (!hasModuleRecord(m, id)) {
    return `<article class="summary-module-card summary-module-card--pending" data-testid="summary-card-${id}">
      <header class="summary-card-head">
        <h3 class="summary-card-title"><span class="summary-card-num">${display.index}.</span> ${display.everydayTitle}</h3>
        <p class="summary-card-subtitle">${illusion}</p>
      </header>
      <p class="summary-card-section"><strong>¿De qué trataba esta prueba?</strong> ${display.about}</p>
      <p class="summary-card-section summary-card-section--muted"><em>No realizaste esta prueba en esta sesión.</em></p>
    </article>`;
  }

  const partial = id !== 'balance' && (Boolean(m.partial) || !isStereoComplete(m, id));
  const badge = moduleBadge(id, m, partial);
  const partialClass = partial ? ' summary-module-card--partial' : '';
  const metrics = formatMetricsHuman(id, m);
  const answered = formatWhatYouAnswered(id, m, partial);
  const meaning = formatWhatItMeans(id, m, partial);

  return `<article class="summary-module-card${partialClass}" data-testid="summary-card-${id}">
    <header class="summary-card-head">
      <span class="summary-badge summary-badge--${badge.tone}">${escapeHtml(badge.label)}</span>
      <h3 class="summary-card-title"><span class="summary-card-num">${display.index}.</span> ${display.everydayTitle}</h3>
      <p class="summary-card-subtitle">${illusion}</p>
    </header>
    <div class="summary-card-body">
      <p class="summary-card-section"><strong>¿De qué trataba esta prueba?</strong> ${display.about}</p>
      <p class="summary-card-section"><strong>Lo que respondiste:</strong> ${escapeHtml(answered)}</p>
      ${partial ? '<p class="summary-partial-note"><em>Incompleta: falta la ronda 2/2 con los dos ojos en el visor.</em></p>' : ''}
      <p class="summary-card-section summary-card-section--meaning"><strong>¿Qué significa esto?</strong> ${escapeHtml(meaning)}</p>
      <details class="summary-tech">
        <summary>Dato técnico</summary>
        <p class="metrics-cell" data-testid="summary-metrics-${id}">${escapeHtml(metrics)}</p>
      </details>
    </div>
  </article>`;
}

function moduleBadge(id, m, partial) {
  if (partial) {
    return { label: 'Incompleta (falta ronda 2/2)', tone: 'partial' };
  }
  switch (id) {
    case 'balance': {
      const eye = balanceDominanceEye(m.imbalanceRatio);
      if (eye === 'balanced') return { label: 'Equilibrado', tone: 'ok' };
      if (eye === 'right' || eye === 'left') return { label: 'Posible ojo dominante', tone: 'warn' };
      return { label: 'Registrado', tone: 'neutral' };
    }
    case 'hollow-mask': {
      if (m.monoPercept === 'convex' && m.stereoPercept === 'concave') {
        return { label: 'Buena señal 3D', tone: 'ok' };
      }
      if (m.stereoPercept === 'convex') return { label: 'Ilusión habitual', tone: 'neutral' };
      return { label: 'Registrado', tone: 'neutral' };
    }
    case 'ames': {
      if (m.monoJudgment && m.stereoJudgment && m.monoJudgment !== m.stereoJudgment) {
        return { label: 'Buena señal 3D', tone: 'ok' };
      }
      return { label: 'Ilusión habitual', tone: 'neutral' };
    }
    case 'rds': {
      if (m.stereoDepth === 'near' || m.stereoDepth === 'far') {
        return { label: 'Buena señal 3D', tone: 'ok' };
      }
      if (m.stereoDepth === 'none') return { label: 'Sin relieve 3D', tone: 'warn' };
      return { label: 'Registrado', tone: 'neutral' };
    }
    default:
      return { label: 'Registrado', tone: 'neutral' };
  }
}

function buildOverallNarrative(mods) {
  const lines = [];

  const balance = mods.balance;
  if (balance?.imbalanceRatio != null) {
    const eye = balanceDominanceEye(balance.imbalanceRatio);
    if (eye === 'balanced') {
      lines.push(
        'En la prueba de equilibrio entre ojos, ambos lados pidieron un refuerzo de brillo parecido: trabajaron en equipo.'
      );
    } else if (eye === 'right') {
      lines.push(
        'En la prueba de equilibrio, un lado necesitó más brillo que el otro para verse igual; eso puede indicar que un ojo lleva más el peso visual (a veces llamado ojo dominante o «ojo vago» en el otro).'
      );
    } else if (eye === 'left') {
      lines.push(
        'En la prueba de equilibrio, el patrón se inclinó hacia el otro lado: un ojo pareció necesitar menos refuerzo que su compañero para verse igual de claro.'
      );
    } else {
      lines.push('La prueba de equilibrio entre ojos quedó guardada, pero el número no es concluyente en esta sesión.');
    }
  }

  let depthSignals = 0;
  let illusionHolds = 0;
  let noDepth = 0;
  let partialCount = 0;

  const hm = mods['hollow-mask'];
  if (hm?.stereoPercept) {
    if (hm.stereoPercept === 'concave' && hm.monoPercept === 'convex') depthSignals += 1;
    else if (hm.stereoPercept === 'convex' && hm.monoPercept === 'convex') illusionHolds += 1;
  } else if (hasModuleRecord(hm, 'hollow-mask')) partialCount += 1;

  const ames = mods.ames;
  if (ames?.stereoJudgment) {
    if (ames.monoJudgment && ames.monoJudgment !== ames.stereoJudgment) depthSignals += 1;
    else illusionHolds += 1;
  } else if (hasModuleRecord(ames, 'ames')) partialCount += 1;

  const rds = mods.rds;
  if (rds?.stereoDepth) {
    if (rds.stereoDepth === 'near' || rds.stereoDepth === 'far') depthSignals += 1;
    else if (rds.stereoDepth === 'none') noDepth += 1;
  } else if (hasModuleRecord(rds, 'rds')) partialCount += 1;

  if (depthSignals >= 2) {
    lines.push(
      'Con los dos ojos activos obtuviste varias pistas de profundidad 3D real — no solo ilusiones de un solo ojo.'
    );
  } else if (depthSignals === 1) {
    lines.push('Al menos una prueba con dos ojos mostró que combinaste ambas vistas para ver profundidad de otra forma.');
  } else if (illusionHolds >= 2 && noDepth === 0) {
    lines.push(
      'Varias pruebas mantuvieron la misma impresión con un ojo y con dos; el cerebro siguió «rellenando» con sus atajos habituales.'
    );
  }
  if (noDepth >= 1) {
    lines.push(
      'En la prueba de puntos ocultos no apareció una figura en relieve con ambos ojos; no significa un problema grave, pero conviene repetirla en calma o comentarla con un especialista si persiste.'
    );
  }
  if (partialCount > 0) {
    lines.push(
      `Hay ${partialCount} prueba(s) con solo la ronda de un ojo; termina la ronda «dos ojos» para completar el panorama.`
    );
  }

  if (lines.length === 0) {
    return 'Cuando completes las cuatro pruebas en el visor, aquí verás una lectura global fácil de entender. Cada tarjeta abajo explica una prueba por separado.';
  }

  lines.push(
    'Lee las cuatro tarjetas en orden: la primera habla del reparto de trabajo entre ojos; las otras tres exploran si, al usar ambos a la vez, logras ver profundidad más allá de las ilusiones.'
  );

  return lines.join(' ');
}

function balanceDominanceEye(ir) {
  if (typeof ir !== 'number' || !Number.isFinite(ir)) return null;
  if (ir >= 0.85 && ir <= 1.15) return 'balanced';
  if (ir < 0.85) return 'right';
  return 'left';
}

function formatWhatYouAnswered(id, m, partial) {
  switch (id) {
    case 'balance': {
      const ir = m.imbalanceRatio;
      if (typeof ir !== 'number' || !Number.isFinite(ir)) {
        return m.interpretation || 'No hay un valor numérico claro en esta sesión.';
      }
      if (ir >= 0.85 && ir <= 1.15) {
        return 'Para que ambos lados se vieran igual de claros, ajustaste el brillo de forma bastante pareja entre ojo izquierdo y derecho.';
      }
      if (ir < 0.85) {
        return 'Para ver ambos lados igual de claros, tu ojo izquierdo necesitó más brillo o contraste que el derecho.';
      }
      return 'Para ver ambos lados igual de claros, tu ojo derecho necesitó más brillo o contraste que el izquierdo.';
    }
    case 'hollow-mask': {
      const mono = perceptPlain(m.monoPercept);
      if (partial || !m.stereoPercept) {
        return `Con un solo ojo describiste la máscara como «${mono}». Aún no hay respuesta guardada con los dos ojos.`;
      }
      const stereo = perceptPlain(m.stereoPercept);
      if (m.monoPercept === 'convex' && m.stereoPercept === 'concave') {
        return 'Con un ojo la viste saliendo hacia afuera y con dos ojos la viste hueca hacia adentro.';
      }
      if (m.stereoPercept === 'convex' && m.monoPercept === 'convex') {
        return 'Tanto con un ojo como con dos la percibiste saliendo hacia ti (como un relieve).';
      }
      return `Con un ojo: «${mono}». Con dos ojos: «${stereo}».`;
    }
    case 'ames': {
      const mono = judgePlain(m.monoJudgment);
      if (partial || !m.stereoJudgment) {
        return `Con un solo ojo indicaste que ${mono}. Falta la respuesta con los dos ojos.`;
      }
      const stereo = judgePlain(m.stereoJudgment);
      if (m.monoJudgment !== m.stereoJudgment) {
        return `Con un ojo ${mono}; con dos ojos ${stereo}.`;
      }
      return `Con un ojo y con dos ojos ${stereo}.`;
    }
    case 'rds': {
      if (partial || !m.stereoDepth) {
        const md = depthPlain(m.monoDepth);
        return `Con un solo ojo: ${md}. Todavía no hay respuesta registrada con los dos ojos.`;
      }
      if (m.stereoDepth === 'near') {
        return 'Con dos ojos viste la figura saliendo hacia ti.';
      }
      if (m.stereoDepth === 'far') {
        return 'Con dos ojos viste la figura hundida, como si estuviera más lejos.';
      }
      return 'Con dos ojos no diste a ver una figura en relieve entre los puntos.';
    }
    default:
      return m.interpretation || '—';
  }
}

function formatWhatItMeans(id, m, partial) {
  switch (id) {
    case 'balance': {
      const ir = m.imbalanceRatio;
      if (typeof ir !== 'number' || !Number.isFinite(ir)) {
        return 'Sin un número fiable no podemos orientarte sobre el equilibrio entre ojos en esta corrida.';
      }
      const eye = balanceDominanceEye(ir);
      if (eye === 'balanced') {
        return 'Cuando el ajuste queda en un rango equilibrado, suele indicar que ningún ojo necesitó mucho más «empuje» que el otro en esta tarea — aunque el cansancio del día a día puede cambiarlo.';
      }
      if (eye === 'right') {
        return 'Si el ojo izquierdo pidió más refuerzo para igualar al derecho, a veces interpretamos que el derecho guía un poco más la claridad percibida (equivalente informal a ojo dominante). Es una pista exploratoria, no un diagnóstico.';
      }
      return 'Si el ojo derecho pidió más refuerzo, el izquierdo pudo llevar un poco más la batuta en contraste percibido. Repetir en otro momento ayuda a confirmar si es un patrón estable.';
    }
    case 'hollow-mask': {
      if (partial) {
        return 'Sin la ronda de dos ojos no sabemos si tu cerebro corrige la ilusión o se queda con la primera impresión.';
      }
      if (m.monoPercept === 'convex' && m.stereoPercept === 'concave') {
        return 'Muchas personas ven la máscara «inflada» con un ojo; cuando ambos ojos aportan profundidad, a veces aparece el hueco real. Eso es una buena señal de que tu vista binocular ayudó.';
      }
      if (m.stereoPercept === 'convex') {
        return 'Verla saliente incluso con dos ojos es muy común: la forma de la máscara engaña al cerebro. No es raro; solo indica que la ilusión ganó en esta prueba.';
      }
      return 'Compara si tu sensación cambió al pasar de un ojo a dos; ahí está la pista sobre profundidad combinada.';
    }
    case 'ames': {
      if (partial) {
        return 'La ilusión del cuarto trapezoidal suele dominar con un ojo; hace falta la ronda binocular para ver si corrige el tamaño.';
      }
      if (m.monoJudgment && m.stereoJudgment && m.monoJudgment !== m.stereoJudgment) {
        return 'El cuarto de Ames engaña el tamaño con un ojo. Si con dos ojos cambias de opinión, tu vista 3D pudo compensar la perspectiva — lo esperable en buena visión binocular.';
      }
      return 'Si la respuesta no cambió, la ilusión del tamaño siguió mandando incluso con dos ojos; puede pasar y no implica por sí solo un problema clínico.';
    }
    case 'rds': {
      if (partial) {
        return 'La figura escondida casi siempre requiere combinar ambos ojos; completa la segunda ronda para saber si la detectaste.';
      }
      if (m.stereoDepth === 'near' || m.stereoDepth === 'far') {
        return 'Sacar una figura de puntos repetitivos es la prueba clásica de profundidad con ambos ojos. Verla en relieve sugiere que tu cerebro unió bien las dos imágenes a la separación de esta sesión.';
      }
      if (m.stereoDepth === 'none') {
        return 'No ver la figura puede deberse a cansancio, mala fusión momentánea o separación difícil para ti hoy. Si pasa a menudo, un optómetra puede valorar la visión binocular con más detalle.';
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
      return `Razón de balance: ${fmtNum(m.imbalanceRatio)} · ${m.trials ?? '—'} ensayos · ${m.reversals ?? '—'} reversiones`;
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

function perceptPlain(p) {
  if (p === 'convex') return 'saliendo hacia afuera (como un relieve)';
  if (p === 'concave') return 'hueca hacia adentro';
  return labelPercept(p);
}

function judgePlain(j) {
  if (j === 'left') return 'la figura de la izquierda parecía más grande';
  if (j === 'right') return 'la figura de la derecha parecía más grande';
  if (j === 'equal') return 'las dos figuras parecían del mismo tamaño';
  return labelJudge(j);
}

function depthPlain(d) {
  if (d === 'near') return 'notaste algo saliendo';
  if (d === 'far') return 'notaste algo hundido';
  if (d === 'none') return 'no viste figura clara';
  return labelDepth(d);
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
      short: MODULE_DISPLAY[id].everydayTitle,
      recorded,
      full,
    };
  });
  el.innerHTML = `
    <h2>Cómo se conectan las 4 pruebas</h2>
    <p class="cross-pattern-lead">
      La primera prueba mira si un ojo parece cargar más trabajo visual. Las otras tres preguntan si, al usar ambos ojos,
      logras profundidad 3D más allá de lo que engaña un solo ojo. Juntas dan una imagen más fiable que cualquiera por separado.
    </p>
    <div class="cross-grid">
      ${items
        .map((i) => {
          const cls = i.full ? 'cross-cell--ok' : i.recorded ? 'cross-cell--partial' : 'cross-cell--pending';
          const note = i.full
            ? 'dato registrado'
            : i.recorded
              ? 'solo ronda 1/2 — falta Dos ojos'
              : 'pendiente';
          return `<div class="cross-cell ${cls}">
            <span class="cross-cell__title">${i.id === 'balance' ? '1' : i.id === 'hollow-mask' ? '2' : i.id === 'ames' ? '3' : '4'}. ${escapeHtml(i.short)}</span>
            <small class="cross-cell__status">${note}</small>
          </div>`;
        })
        .join('')}
    </div>
    <p class="hint cross-pattern-footer">
      Si una prueba de profundidad falla pero el equilibrio entre ojos está muy desviado, puede ser coherente mirar ambas pistas.
      Si algo te preocupa o se repite en varias sesiones, coméntalo con un optómetra u oftalmólogo; este resumen solo orienta.
    </p>
  `;
}