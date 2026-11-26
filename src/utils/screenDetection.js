/**
 * Detección automática de PPI físico (px/pulgada) a partir de resolución lógica, DPR y perfiles conocidos.
 * Cardboard: siempre asume landscape — el ancho útil es el lado largo de la pantalla (iOS Safari
 * mantiene screen.width en el lado corto aunque el teléfono esté horizontal).
 * pxPerMm = ppi / 25.4
 */

/** Perfiles: ancho lógico × alto lógico (retrato), DPR, PPI físico nominal */
const DEVICE_PROFILES = [
  { id: 'iphone-se-2', w: 375, h: 667, dpr: 2, ppi: 326 },
  { id: 'iphone-se-3', w: 375, h: 667, dpr: 2, ppi: 326 },
  { id: 'iphone-xr', w: 414, h: 896, dpr: 2, ppi: 326 },
  { id: 'iphone-11', w: 414, h: 896, dpr: 2, ppi: 326 },
  { id: 'iphone-12-mini', w: 375, h: 812, dpr: 3, ppi: 476 },
  { id: 'iphone-13-mini', w: 375, h: 812, dpr: 3, ppi: 476 },
  { id: 'iphone-12', w: 390, h: 844, dpr: 3, ppi: 460 },
  { id: 'iphone-13', w: 390, h: 844, dpr: 3, ppi: 460 },
  { id: 'iphone-14', w: 390, h: 844, dpr: 3, ppi: 460 },
  { id: 'iphone-15', w: 393, h: 852, dpr: 3, ppi: 460 },
  { id: 'iphone-12-pro', w: 390, h: 844, dpr: 3, ppi: 460 },
  { id: 'iphone-13-pro', w: 390, h: 844, dpr: 3, ppi: 460 },
  { id: 'iphone-14-pro', w: 393, h: 852, dpr: 3, ppi: 460 },
  { id: 'iphone-14-plus', w: 428, h: 926, dpr: 3, ppi: 458 },
  { id: 'iphone-15-plus', w: 430, h: 932, dpr: 3, ppi: 460 },
  { id: 'iphone-14-pro-max', w: 430, h: 932, dpr: 3, ppi: 460 },
  { id: 'iphone-15-pro-max', w: 430, h: 932, dpr: 3, ppi: 460 },
  { id: 'iphone-16', w: 393, h: 852, dpr: 3, ppi: 460 },
  { id: 'iphone-16-pro', w: 402, h: 874, dpr: 3, ppi: 460 },
  { id: 'pixel-5', w: 393, h: 851, dpr: 2.75, ppi: 432 },
  { id: 'pixel-6', w: 412, h: 915, dpr: 2.625, ppi: 411 },
  { id: 'pixel-7', w: 412, h: 915, dpr: 2.625, ppi: 416 },
  { id: 'galaxy-s21', w: 360, h: 800, dpr: 3, ppi: 421 },
  { id: 'galaxy-s22', w: 360, h: 780, dpr: 3, ppi: 425 },
  { id: 'galaxy-s23', w: 360, h: 780, dpr: 3, ppi: 425 },
];

const LOGICAL_TOL = 4;
const DPR_TOL = 0.35;

/** Siempre landscape Cardboard: lado corto = min(screen), lado largo = max(screen, inner). */
function readScreenMetrics() {
  if (typeof window === 'undefined') {
    return {
      logicalW: 390,
      logicalH: 844,
      landscapeCssPx: 844,
      landscapePhysPx: 844 * 3,
      dpr: 3,
      innerW: 390,
      innerH: 844,
      screenW: 390,
      screenH: 844,
      assumesLandscape: true,
    };
  }

  const dpr = window.devicePixelRatio || 1;
  const screenW = window.screen?.width ?? window.innerWidth;
  const screenH = window.screen?.height ?? window.innerHeight;

  const shortSideCss = Math.min(screenW, screenH);
  const longSideScreenCss = Math.max(screenW, screenH);
  const innerLandscape = Math.max(window.innerWidth, window.innerHeight);
  const innerPortrait = Math.min(window.innerWidth, window.innerHeight);
  const landscapeCssPx = Math.max(longSideScreenCss, innerLandscape);
  const logicalW = shortSideCss;
  const logicalH = longSideScreenCss;

  return {
    logicalW,
    logicalH,
    landscapeCssPx,
    landscapePhysPx: landscapeCssPx * dpr,
    dpr,
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    innerLandscape,
    innerPortrait,
    screenW,
    screenH,
    assumesLandscape: true,
  };
}

function matchProfile(metrics) {
  const { logicalW, logicalH, dpr } = metrics;
  for (const p of DEVICE_PROFILES) {
    if (
      Math.abs(logicalW - p.w) <= LOGICAL_TOL &&
      Math.abs(logicalH - p.h) <= LOGICAL_TOL &&
      Math.abs(dpr - p.dpr) <= DPR_TOL
    ) {
      return p;
    }
  }
  return null;
}

function fallbackPpi(metrics) {
  const { logicalW, dpr } = metrics;
  const isCoarsePointer =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)')?.matches === true;
  const isMobileUa =
    typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isCoarsePointer || isMobileUa) {
    if (dpr >= 2.9) return 460;
    if (dpr >= 2) return 326;
    return 400;
  }

  const physShort = logicalW * dpr;
  if (physShort > 0) {
    const inferredInches = physShort / 96;
    if (inferredInches > 2 && inferredInches < 20) {
      const ppi = physShort / inferredInches;
      return Math.max(96, Math.min(560, ppi));
    }
  }

  return 110;
}

/**
 * @returns {{
 *   ppi: number,
 *   pxPerMm: number,
 *   landscapeWidthMm: number,
 *   profileId: string|null,
 *   source: 'profile'|'fallback',
 *   metrics: object,
 *   assumesLandscape: boolean,
 * }}
 */
export function detectScreenPpi() {
  const metrics = readScreenMetrics();
  const profile = matchProfile(metrics);
  const ppi = profile ? profile.ppi : fallbackPpi(metrics);
  const pxPerMm = ppi / 25.4;
  const landscapePhysPx = metrics.landscapePhysPx ?? metrics.landscapeCssPx * metrics.dpr;
  const landscapeWidthMm = (landscapePhysPx / ppi) * 25.4;

  return {
    ppi: Math.round(ppi * 10) / 10,
    pxPerMm,
    landscapeWidthMm: Math.round(landscapeWidthMm * 10) / 10,
    profileId: profile?.id ?? null,
    source: profile ? 'profile' : 'fallback',
    metrics,
    assumesLandscape: true,
  };
}

export function formatAutoPpiLabel(detection) {
  const mm = detection.landscapeWidthMm?.toFixed(1) ?? '—';
  const landscapeNote = ` · ancho horizontal ~${mm} mm (Cardboard landscape)`;
  if (detection.profileId) {
    return `Detectado automáticamente (${detection.ppi.toFixed(1)} PPI · ${detection.profileId.replace(/-/g, ' ')}${landscapeNote})`;
  }
  return `Detectado automáticamente (${detection.ppi.toFixed(1)} PPI · estimación ${detection.source}${landscapeNote})`;
}