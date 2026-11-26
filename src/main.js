import { appState, setState, subscribe } from './app/state.js';
import { loadCalibration, applyAutoScreenPpiIfNeeded } from './utils/storage.js';
import { detectScreenPpi } from './utils/screenDetection.js';
import { renderHome } from './ui/screens/home.js';
import { renderCalibration } from './ui/screens/calibration.js';
import { renderModules } from './ui/screens/modules.js';
import { renderSummary } from './ui/screens/summary.js';

const appRoot = document.getElementById('app');

function navigate(screen, patch = {}) {
  if (patch.calibration) setState({ calibration: patch.calibration });
  if (patch.mode) setState({ mode: patch.mode });
  setState({ screen, ...patch });
  render();
}

function render() {
  const nav = { onNavigate: navigate };
  appState.calibration = loadCalibration();

  switch (appState.screen) {
    case 'calibration':
      renderCalibration(appRoot, appState, nav);
      break;
    case 'modules':
      renderModules(appRoot, appState, nav);
      break;
    case 'summary':
      renderSummary(appRoot, nav);
      break;
    case 'home':
    default:
      renderHome(appRoot, nav);
      break;
  }
}

subscribe(() => {});
applyAutoScreenPpiIfNeeded();
render();

if (typeof window !== 'undefined') {
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
    navigate,
    appState,
    getScreenDetection: () => detectScreenPpi(),
  };
}