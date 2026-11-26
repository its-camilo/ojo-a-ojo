export function renderHome(root, { onNavigate }) {
  root.innerHTML = `
    <main class="screen screen--home">
      <header class="home-hero">
        <div class="optic-motif" aria-hidden="true">
          <span class="lens lens--left"></span>
          <span class="lens lens--right"></span>
          <span class="lens-bridge"></span>
        </div>
        <h1>Ojo a Ojo</h1>
        <p class="lead">
          Visor estereoscópico en el celular con Google Cardboard: cuatro ilusiones 3D para explorar
          balance, profundidad y fusión binocular con precisión de laboratorio visual.
        </p>
      </header>

      <section class="card home-start">
        <h2>Preparar el visor</h2>
        <p>Calibra pantalla e IPD en horizontal, luego ejecuta los cuatro módulos en secuencia o por separado.</p>
        <button type="button" class="btn btn--primary btn--wide" id="btn-cardboard">
          Comenzar con Cardboard
        </button>
        <p class="hint">En iPhone Safari, active el giroscopio con un toque durante la calibración o al abrir un módulo.</p>
      </section>

      <nav class="home-nav actions-row">
        <button type="button" class="btn btn--ghost" id="btn-calib">Calibración</button>
        <button type="button" class="btn btn--ghost" id="btn-tests">Módulos 3D</button>
        <button type="button" class="btn btn--ghost" id="btn-summary">Resumen de sesión</button>
      </nav>
    </main>
  `;

  const goCardboard = (screen, extra = {}) =>
    onNavigate(screen, { mode: 'cardboard', ...extra });

  root.querySelector('#btn-cardboard').onclick = () => goCardboard('calibration');
  root.querySelector('#btn-calib').onclick = () => goCardboard('calibration');
  root.querySelector('#btn-tests').onclick = () => goCardboard('modules');
  root.querySelector('#btn-summary').onclick = () => onNavigate('summary');
}