import {
  appState,
  setState,
  subscribe,
  hasMeaningfulSession,
} from '../domain/sessionState.js';
import { loadCalibration, applyAutoScreenPpiIfNeeded } from '../services/storage.js';
import { detectScreenPpi } from '../services/screenDetection.js';
import { renderHome } from '../ui/views/homeView.js';
import { renderCalibration } from '../ui/views/calibrationView.js';
import { renderSession } from '../ui/views/sessionView.js';
import { renderSummary } from '../ui/views/summaryView.js';
import { createRouter, pathToScreen, screenToPath } from './router.js';

export function startApp() {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  let disposeSessionView = null;

  const render = () => {
    const nav = { onNavigate };
    appState.calibration = loadCalibration();

    switch (appState.screen) {
      case 'calibration':
        disposeSessionView?.();
        disposeSessionView = null;
        renderCalibration(appRoot, appState, nav);
        break;
      case 'modules':
        disposeSessionView?.();
        disposeSessionView = renderSession(appRoot, appState, nav);
        break;
      case 'summary':
        disposeSessionView?.();
        disposeSessionView = null;
        renderSummary(appRoot, nav);
        break;
      case 'home':
      default:
        disposeSessionView?.();
        disposeSessionView = null;
        renderHome(appRoot, nav);
        break;
    }
  };

  const onNavigate = (screen, patch = {}) => {
    if (screen === 'summary' && !hasMeaningfulSession()) {
      setState({ screen: 'home' });
      router.navigate('/', { replace: true });
      render();
      return;
    }
    if (patch.calibration) setState({ calibration: patch.calibration });
    if (patch.mode) setState({ mode: patch.mode });
    setState({ screen, ...patch });
    const path = screenToPath(screen);
    if (path !== location.pathname) router.navigate(path);
    render();
  };

  const router = createRouter({
    onNavigate: (pathname) => {
      const screen = pathToScreen(pathname);
      if (screen === 'summary' && !hasMeaningfulSession()) {
        setState({ screen: 'home' });
        router.navigate('/', { replace: true });
        render();
        return;
      }
      if (appState.screen !== screen) setState({ screen });
      render();
    },
  });

  subscribe(() => {});
  applyAutoScreenPpiIfNeeded();
  router.start();

  const refreshAutoPpi = () => {
    const updated = applyAutoScreenPpiIfNeeded();
    if (appState.screen === 'calibration') {
      appState.calibration = updated;
      render();
    } else {
      appState.calibration = loadCalibration();
    }
  };
  window.addEventListener('orientationchange', refreshAutoPpi);
  window.addEventListener('resize', refreshAutoPpi);

  window.__OJO_A_OJO__ = {
    navigate: onNavigate,
    appState,
    getScreenDetection: () => detectScreenPpi(),
    router,
  };
}