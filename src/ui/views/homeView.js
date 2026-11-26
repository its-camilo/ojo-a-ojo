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
          Visor estereoscópico en el celular con Cardboard: cuatro ilusiones 3D para explorar
          balance, profundidad y fusión binocular con precisión de laboratorio visual.
        </p>
      </header>

      <section class="card home-start">
        <h2>Iniciar</h2>
        <p>Calibra pantalla e IPD en horizontal y ejecuta las cuatro pruebas en el visor.</p>
        <button type="button" class="btn btn--primary btn--wide" id="btn-cardboard">
          Comenzar con Cardboard
        </button>
        <p class="hint">En iPhone Safari, active el giroscopio con un toque durante la calibración o al abrir un módulo.</p>
      </section>
    </main>
  `;

  root.querySelector('#btn-cardboard').onclick = () =>
    onNavigate('calibration', { mode: 'cardboard' });
}