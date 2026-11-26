/** Dimensiones de calibración pensadas para Cardboard en landscape (horizontal). */

export const CARD_ASPECT = 85.6 / 53.98;

/**
 * @returns {{ viewportW: number, viewportH: number, landscapeW: number, landscapeH: number, isLandscape: boolean }}
 */
export function getCalibrationViewport() {
  if (typeof window === 'undefined') {
    return { viewportW: 844, viewportH: 390, landscapeW: 844, landscapeH: 390, isLandscape: true };
  }
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const landscapeW = Math.max(viewportW, viewportH);
  const landscapeH = Math.min(viewportW, viewportH);
  const isLandscape = viewportW >= viewportH;
  return { viewportW, viewportH, landscapeW, landscapeH, isLandscape };
}

/**
 * Tamaño del rectángulo ISO (borde punteado) escalado al ancho horizontal visible.
 * @param {number} ppi
 */
export function cardVisualSizePx(ppi) {
  const idealW = (85.6 / 25.4) * ppi;
  const idealH = (53.98 / 25.4) * ppi;
  const { landscapeW, landscapeH, isLandscape } = getCalibrationViewport();
  const pad = 32;
  const maxW = (isLandscape ? landscapeW : landscapeW) - pad;
  const maxH = Math.max(120, landscapeH * 0.38);
  const scale = Math.min(1, maxW / idealW, maxH / idealH);
  const width = idealW * scale;
  const height = idealH * scale;
  return { width, height, scale, idealW, idealH };
}

/**
 * Ancho en px del detector de borde punteado (lado largo horizontal).
 * @param {{ metrics?: { landscapeCssPx?: number } }} detection
 */
export function landscapeGuideWidthPx(detection) {
  const { viewportW, landscapeW, isLandscape } = getCalibrationViewport();
  const detectedLong = detection?.metrics?.landscapeCssPx ?? landscapeW;
  const available = (isLandscape ? viewportW : landscapeW) - 32;
  return Math.max(120, Math.min(detectedLong, available));
}

/** Ancho del canvas Nonius en landscape (paridad con mitades estéreo). */
export function noniusCanvasWidthPx(detection) {
  return landscapeGuideWidthPx(detection);
}

export const NONIUS_HEIGHT = 120;