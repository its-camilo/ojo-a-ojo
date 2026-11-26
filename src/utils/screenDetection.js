/**
 * Detección automática de PPI físico (px/pulgada) a partir de resolución lógica, DPR y perfiles conocidos.
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

function readScreenMetrics() {
  if (typeof window === 'undefined') {
    return {
      logicalW: 390,
      logicalH: 844,
      dpr: 1,
      innerW: 390,
      innerH: 844,
      screenW: 390,
      screenH: 844,
    };
  }

  const dpr = window.devicePixelRatio || 1;
  const screenW = window.screen?.width ?? window.innerWidth;
  const screenH = window.screen?.height ?? window.innerHeight;
  const logicalW = Math.min(screenW, screenH);
  const logicalH = Math.max(screenW, screenH);

  return {
    logicalW,
    logicalH,
    dpr,
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    screenW,
    screenH,
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
  const { logicalW, dpr, innerW } = metrics;
  const physW = logicalW * dpr;
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

  const refCss = innerW > 0 ? innerW : logicalW;
  if (refCss > 0 && physW > 0) {
    const inferredInches = physW / (96 * dpr);
    if (inferredInches > 2 && inferredInches < 20) {
      const ppi = physW / inferredInches;
      return Math.max(96, Math.min(560, ppi));
    }
  }

  return 110;
}

/**
 * @returns {{ ppi: number, pxPerMm: number, profileId: string|null, source: 'profile'|'fallback', metrics: object }}
 */
export function detectScreenPpi() {
  const metrics = readScreenMetrics();
  const profile = matchProfile(metrics);
  const ppi = profile ? profile.ppi : fallbackPpi(metrics);
  return {
    ppi: Math.round(ppi * 10) / 10,
    pxPerMm: ppi / 25.4,
    profileId: profile?.id ?? null,
    source: profile ? 'profile' : 'fallback',
    metrics,
  };
}

export function formatAutoPpiLabel(detection) {
  if (detection.profileId) {
    return `Detectado automáticamente (${detection.ppi.toFixed(1)} PPI · ${detection.profileId.replace(/-/g, ' ')})`;
  }
  return `Detectado automáticamente (${detection.ppi.toFixed(1)} PPI · estimación ${detection.source})`;
}