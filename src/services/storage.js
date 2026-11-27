import { detectScreenPpi } from './screenDetection.js';

const STORAGE_KEY = 'ojo-a-ojo-calibration-v1';
const RESULTS_KEY = 'ojo-a-ojo-results-v1';

export const DEFAULT_CALIBRATION = {
  ppi: 400,
  ppiAuto: null,
  ppiManual: false,
  ppiProfileId: null,
  ipdMm: 63.9,
  k1: 0.33582564,
  k2: 0.55348791,
  lensEyeDistanceMm: 39.3,
  noniusOffsetPx: 0,
  gyroEnabled: false,
};

export function loadCalibration() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CALIBRATION };
    return { ...DEFAULT_CALIBRATION, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CALIBRATION };
  }
}

/** Aplica PPI automático si el usuario no fijó valor manual; persiste cuando cambia. */
export function applyAutoScreenPpiIfNeeded() {
  if (typeof localStorage === 'undefined') return loadCalibration();
  const cal = loadCalibration();
  if (cal.ppiManual) return cal;

  const detection = detectScreenPpi();
  const changed =
    cal.ppi !== detection.ppi ||
    cal.ppiAuto !== detection.ppi ||
    cal.ppiProfileId !== detection.profileId;

  if (changed) {
    const next = {
      ...cal,
      ppi: detection.ppi,
      ppiAuto: detection.ppi,
      ppiProfileId: detection.profileId,
      ppiManual: false,
    };
    saveCalibration(next);
    return next;
  }
  return cal;
}

export function resetPpiToAuto() {
  const cal = loadCalibration();
  const detection = detectScreenPpi();
  const next = {
    ...cal,
    ppi: detection.ppi,
    ppiAuto: detection.ppi,
    ppiProfileId: detection.profileId,
    ppiManual: false,
  };
  saveCalibration(next);
  return next;
}

export function saveCalibration(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function normalizeSessionShape(session) {
  const base = session ?? { modules: {}, startedAt: null, finishedAt: null };
  if (!base.modules || typeof base.modules !== 'object' || Array.isArray(base.modules)) {
    base.modules = {};
  }
  return base;
}

export function loadSessionResults() {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (!raw) return null;
    return normalizeSessionShape(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSessionResults(results) {
  const normalized = normalizeSessionShape(results);
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.warn('[ojo-a-ojo] No se pudo persistir la sesión en localStorage', err);
  }
  return normalized;
}

export function clearSessionResults() {
  localStorage.removeItem(RESULTS_KEY);
}