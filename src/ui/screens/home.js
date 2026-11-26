export function renderHome(root, { onNavigate }) {
  root.innerHTML = `
    <main class="screen screen--home">
      <header class="hero">
        <p class="eyebrow">UNAL Bogotá · Computación Visual 2026-2 · Proyecto 3</p>
        <h1>Ojo a Ojo</h1>
        <p class="lead">
          Prototipo académico de <strong>tamizaje visual</strong> con ilusiones ópticas en 3D
          para celular en visor Google Cardboard básico. <em>No es diagnóstico clínico.</em>
        </p>
      </header>
      <section class="card disclaimer" role="note">
        <h2>Aviso ético</h2>
        <p>
          Este software es un primer filtro exploratorio. No sustituye examen optométrico u oftalmológico,
          agudeza visual, cover test ni pruebas clínicas validadas.
        </p>
      </section>
      <section class="card">
        <h2>Modo de uso</h2>
        <div class="mode-grid">
          <button type="button" class="btn btn--primary" data-mode="cardboard" id="btn-cardboard">
            Cardboard móvil
          </button>
          <button type="button" class="btn btn--secondary" data-mode="desktop" id="btn-desktop">
            Modo escritorio / defensa
          </button>
        </div>
        <p class="hint">En iPhone Safari use «Activar giroscopio» en calibración tras un toque explícito.</p>
      </section>
      <section class="card actions-row">
        <button type="button" class="btn btn--ghost" id="btn-calib">Calibración</button>
        <button type="button" class="btn btn--ghost" id="btn-tests">Ir a pruebas</button>
        <button type="button" class="btn btn--ghost" id="btn-summary">Ver resumen previo</button>
      </section>
    </main>
  `;

  root.querySelector('#btn-cardboard').onclick = () => onNavigate('calibration', { mode: 'cardboard' });
  root.querySelector('#btn-desktop').onclick = () => onNavigate('calibration', { mode: 'desktop' });
  root.querySelector('#btn-calib').onclick = () => onNavigate('calibration', { mode: 'desktop' });
  root.querySelector('#btn-tests').onclick = () => onNavigate('modules', { mode: 'desktop' });
  root.querySelector('#btn-summary').onclick = () => onNavigate('summary');
}