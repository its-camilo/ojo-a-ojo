/**
 * Estima segundos de arco por píxel de disparidad horizontal (filtro grueso, Bonfanti et al. 2015).
 * viewingDistanceMm: distancia pantalla–ojo aproximada (geometría del visor / Li et al. 2020).
 */
export function disparityArcsecPerPixel(ppi, viewingDistanceMm = 350) {
  if (!ppi || ppi <= 0) return null;
  const mmPerPx = 25.4 / ppi;
  const radians = Math.atan(mmPerPx / viewingDistanceMm);
  return (radians * (180 / Math.PI)) * 3600;
}

export function disparityPxToArcsec(ppi, disparityPx, viewingDistanceMm = 350) {
  const perPx = disparityArcsecPerPixel(ppi, viewingDistanceMm);
  if (perPx == null) return null;
  return perPx * disparityPx;
}