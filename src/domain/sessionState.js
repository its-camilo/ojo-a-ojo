import {
  loadCalibration,
  loadSessionResults,
  normalizeSessionShape,
  saveSessionResults,
} from '../services/storage.js';

const listeners = new Set();

export const appState = {
  screen: 'home',
  mode: 'cardboard',
  calibration: loadCalibration(),
  viewMode: 0,
  monoRound: false,
  moduleIndex: null,
  session: normalizeSessionShape(
    loadSessionResults() || {
      modules: {},
      startedAt: null,
      finishedAt: null,
    }
  ),
  viewerActive: false,
};

export function setState(patch) {
  Object.assign(appState, patch);
  listeners.forEach((fn) => fn(appState));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function mergeSessionFromPersistence() {
  const stored = loadSessionResults();
  const storedMods = stored?.modules ?? {};
  const memoryMods = appState.session?.modules ?? {};
  appState.session = normalizeSessionShape({
    ...stored,
    ...appState.session,
    modules: { ...storedMods, ...memoryMods },
  });
  return appState.session;
}

export function recordModuleResult(moduleId, payload) {
  mergeSessionFromPersistence();
  appState.session.modules[moduleId] = {
    ...payload,
    recordedAt: new Date().toISOString(),
  };
  if (!appState.session.startedAt) {
    appState.session.startedAt =
      loadSessionResults()?.startedAt ?? new Date().toISOString();
  }
  saveSessionResults(appState.session);
}

export function finishSession() {
  appState.session.finishedAt = new Date().toISOString();
  saveSessionResults(appState.session);
}

export function hasMeaningfulSession() {
  return Object.keys(appState.session.modules || {}).length > 0;
}