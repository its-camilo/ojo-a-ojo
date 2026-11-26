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
          Sesión de tamizaje visual con Cardboard: en unos minutos hará
          <strong>cuatro pruebas 3D</strong> (balance entre ojos, máscara hueca, cuarto de Ames y profundidad RDS)
          y al final verá un resumen orientativo en español sencillo — no es un diagnóstico clínico.
        </p>
      </header>

      <section class="card home-start">
        <h2>Iniciar</h2>
        <p>Primero calibra pantalla, separación entre ojos (IPD) y lentes en horizontal; luego en el visor elija cada respuesta manteniendo la mirada <strong>3 s</strong> sobre el botón.</p>
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