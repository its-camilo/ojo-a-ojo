import colorOps from '../shaders/includes/color_ops.glsl?raw';

/** Three.js con glslVersion: GLSL3 ya emite `#version 300 es`; se conserva en el .glsl fuente. */
export function prepareGlslForThree(source) {
  let s = source.replace(/^#version\s+300\s+es\s*\r?\n/i, '');
  s = s.replace('// INSERT_COLOR_OPS', colorOps);
  return s;
}

export function injectColorOps(source) {
  return prepareGlslForThree(source);
}