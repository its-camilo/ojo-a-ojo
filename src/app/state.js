import { loadCalibration, loadSessionResults, saveSessionResults } from '../utils/storage.js';

const listeners = new Set();

export const appState = {
  screen: 'home',
  mode: 'cardboard',
  calibration: loadCalibration(),
  viewMode: 0,
  monoRound: false,
  moduleIndex: null,
  session: loadSessionResults() || {
    modules: {},
    startedAt: null,
    finishedAt: null,
  },
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

export function recordModuleResult(moduleId, payload) {
  appState.session.modules[moduleId] = {
    ...payload,
    recordedAt: new Date().toISOString(),
  };
  if (!appState.session.startedAt) {
    appState.session.startedAt = new Date().toISOString();
  }
  saveSessionResults(appState.session);
}

export function finishSession() {
  appState.session.finishedAt = new Date().toISOString();
  saveSessionResults(appState.session);
}