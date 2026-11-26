const PATH_BY_SCREEN = {
  home: '/',
  calibration: '/calibracion',
  modules: '/sesion',
  summary: '/resumen',
};

const SCREEN_BY_PATH = Object.fromEntries(
  Object.entries(PATH_BY_SCREEN).map(([screen, path]) => [path, screen])
);

export function screenToPath(screen) {
  return PATH_BY_SCREEN[screen] ?? '/';
}

export function pathToScreen(pathname) {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return SCREEN_BY_PATH[normalized] ?? 'home';
}

/**
 * @param {{ onNavigate: (path: string) => void }} handlers
 */
export function createRouter(handlers) {
  const navigate = (path, { replace = false } = {}) => {
    const target = path.startsWith('/') ? path : screenToPath(path);
    const current = `${location.pathname}${location.search}`;
    if (target === current) {
      handlers.onNavigate(target);
      return;
    }
    if (replace) history.replaceState({ path: target }, '', target);
    else history.pushState({ path: target }, '', target);
    handlers.onNavigate(target);
  };

  const start = () => {
    window.addEventListener('popstate', () => handlers.onNavigate(location.pathname));
    handlers.onNavigate(location.pathname);
  };

  return { navigate, start };
}