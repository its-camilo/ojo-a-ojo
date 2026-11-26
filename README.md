# Ojo a Ojo

**Prototipo académico de tamizaje visual** con ilusiones ópticas **3D** para celular en **Google Cardboard** básico de cartón.

- **Curso:** Computación Visual, UNAL Bogotá 2026-2 — Proyecto 3  
- **Profesor:** Jean Pierre Charalambos  
- **Stack:** JavaScript (módulos ES), Vite, Three.js, GLSL `#version 300 es`, CSS modular (sin TypeScript ni frameworks UI).

> **Aviso ético:** Este software es un **primer filtro exploratorio**, no una herramienta de diagnóstico clínico ni tratamiento. Cualquier indicio debe derivarse a evaluación optométrica u oftalmológica.

## Arquitectura

```
src/
├── main.js                 # Enrutado de pantallas (inicio, calibración, módulos, resumen)
├── app/state.js            # Estado de sesión + localStorage
├── ui/screens/             # UI 2D en español (fuera del visor)
├── viewer/
│   ├── StereoRenderer.js   # RTT estéreo + composición SBS
│   ├── GazeDwell.js        # Raycast central ~1,5 s
│   ├── DesktopControls.js  # 3DoF con ratón/teclado (defensa)
│   └── DeviceOrientation.js # Giroscopio + requestPermission (iOS)
├── modules/                # 4 ilusiones 3D
├── shaders/                # GLSL 300 es explícitos (+ color_ops)
└── utils/                  # Calibración, escalera 1-up/1-down, arcsec
```

### Pipeline estéreo (render-to-texture)

Inspirado en el capítulo *Stereo* y *Render to texture* del [vcnotebook](https://vcnotebook.gitlab.io/docs/):

1. Dos cámaras con separación ±IPD/2 (`ipd = 0` en rondas monoculares).
2. Cada ojo renderiza a un `WebGLRenderTarget`.
3. Pasada de composición con **pre-distorsión de barril** Brown-Conrady (Google Cardboard SDK):

   `p' = p (1 + k1 r² + k2 r⁴)` con defaults oficiales `k1 = 0.33582564`, `k2 = 0.55348791` (calibrables).

Archivos: `src/shaders/stereo-compose.*.glsl`, `src/viewer/StereoRenderer.js`.

### Color en luz lineal (`shading/color_ops`)

Los contrastes dicópticos del módulo 1 usan `srgb2lin` / `lin2srgb` del cuaderno en `src/shaders/includes/color_ops.glsl` (insertados en fragment shaders).

### Módulos 3D (v1)

| # | Enfoque | Implementación |
|---|---------|----------------|
| 1 | Balance interocular / supresión | Objetos 3D por capas de cámara + escalera 1-up/1-down (Martín et al., 2020) |
| 2 | Hollow-Mask | Rostro cóncavo procedural; ronda mono vs estéreo (Hill & Bruce, 1993) |
| 3 | Cuarto de Ames | Habitación trapezoidal; juicio de escala (Gehringer & Engel, 1986) |
| 4 | RDS grueso | `InstancedMesh` + shader de partículas; disparidad en px y arcsec (Julesz, 1960; Bonfanti et al., 2015) |

Interacción en el visor: **gaze dwell** central (~1,5 s) con retícula y raycast; clic/toque/Enter como respaldo.

## Cómo ejecutar

```bash
npm install
npm run dev      # desarrollo
npm run build    # producción → dist/
npm run preview  # servir build
npm run test:e2e # Playwright (Chromium) sobre el build
```

### Despliegue en Vercel

- Framework: Vite (`vercel.json` incluido).
- `buildCommand`: `npm run build`, salida `dist/`.
- Añada `manifest.webmanifest` y orientación horizontal para uso tipo PWA en iPhone (mitiga la falta de `requestFullscreen` en Safari).

## Cómo probar

### Escritorio / defensa

1. Inicio → **Modo escritorio**.
2. Calibración (PPI con tarjeta ISO 7810, IPD, Nonius, k1/k2) → Guardar.
3. Elija modo de vista: SBS+barril, SBS plano o monocular.
4. Abra cada módulo; arrastre el ratón o use flechas para orientar la mirada; confirme con dwell, clic o Enter.
5. **Resumen** → exportar JSON.

### Android

- Calibración en pantalla completa; en módulos puede usarse `requestFullscreen` y giroscopio.

### iPhone (Safari)

- Añada a pantalla de inicio (manifest `display: standalone`).
- En calibración, pulse **Activar giroscopio** (`DeviceOrientationEvent.requestPermission`) dentro de un gesto de usuario.
- Use landscape y `100dvh` / `viewport-fit=cover` (ya configurados).
- Cuenta regresiva de 3 s antes de insertar el teléfono en el cardboard.

## Referencias verificadas (resumen)

Solo fuentes del dossier del proyecto; véase `docs/literatura.md` (copia del dossier verificado):

- Ding & Sperling (2006); Martín et al. (2020) — balance binocular / escalera 1-up/1-down.
- Hill & Bruce (1993); Gregory (1970) — máscara hueca.
- Gehringer & Engel (1986); Ittelson (1952) — cuarto de Ames.
- Julesz (1960); Bonfanti et al. (2015) — RDS y límite de arcsec en móvil.
- Li et al. (2020) — calibración PPI con tarjeta.
- Google Cardboard Manufacturer Help — k1, k2, geometría del visor.
- Capítulos vcnotebook: [Stereo](https://vcnotebook.gitlab.io/docs/immersive/stereo/), [Color Ops](https://vcnotebook.gitlab.io/docs/shading/color_ops/), [Render to texture](https://vcnotebook.gitlab.io/docs/archetypes/render-to-texture/), [Picking](https://vcnotebook.gitlab.io/docs/visibility/picking/), [Particles](https://vcnotebook.gitlab.io/docs/geometry/particles/), [Projection](https://vcnotebook.gitlab.io/docs/foundations/projection/).

## GLSL `#version 300 es`

Cada shader en `src/shaders/**/*.glsl` declara `#version 300 es` en el fuente (requisito del curso). En tiempo de ejecución, Three.js también emite la directiva vía `glslVersion: THREE.GLSL3`; `prepareGlslForThree()` elimina la duplicación al compilar.

## Licencia

Prototipo académico UNAL — uso educativo.