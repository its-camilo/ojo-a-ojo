const STORAGE_KEY = 'ojo-a-ojo-calibration-v1';
const RESULTS_KEY = 'ojo-a-ojo-results-v1';

export const DEFAULT_CALIBRATION = {
  ppi: 400,
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

export function saveCalibration(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadSessionResults() {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSessionResults(results) {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

export function clearSessionResults() {
  localStorage.removeItem(RESULTS_KEY);
}