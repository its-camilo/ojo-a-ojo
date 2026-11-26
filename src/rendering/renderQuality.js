import * as THREE from 'three';

export function isMobileViewport() {
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
  if (typeof window !== 'undefined') {
    const narrow = Math.min(window.innerWidth, window.innerHeight) < 520;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (narrow && coarse) return true;
  }
  return false;
}

/** Supersampling factor on eye RTTs over physical pixels (clamped for iOS Safari). */
export function getEyeRttSupersample() {
  return isMobileViewport() ? 1.22 : 1.5;
}

/** @deprecated use getEyeRttSupersample */
export const EYE_RTT_SUPERSAMPLE = getEyeRttSupersample();

/** Hard cap per RTT dimension (iPhone WebGL memory safety). */
export function getEyeRttMaxDimension() {
  return isMobileViewport() ? 1792 : 2560;
}

let _maxAnisotropy = 4;

/**
 * Call once from StereoRenderer after WebGL context is ready.
 * @param {THREE.WebGLRenderer} renderer
 */
export function bindRendererQuality(renderer) {
  _maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
}

export function getMaxAnisotropy() {
  return _maxAnisotropy;
}

/**
 * @param {WebGL2RenderingContext | WebGLRenderingContext} gl
 */
export function getGpuDimensionCap(gl) {
  const maxRb = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096;
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
  return Math.min(maxRb, maxTex, getEyeRttMaxDimension());
}

/**
 * Native devicePixelRatio capped only by GPU framebuffer limits (no artificial DPR=2 cap).
 * @param {THREE.WebGLRenderer} renderer
 * @param {number} cssWidth
 * @param {number} cssHeight
 */
export function computeSafePixelRatio(renderer, cssWidth, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  if (!cssWidth || !cssHeight) return dpr;
  const gl = renderer.getContext();
  const cap = getGpuDimensionCap(gl);
  const maxByW = cap / cssWidth;
  const maxByH = cap / cssHeight;
  return Math.min(dpr, maxByW, maxByH);
}

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {number} eyeCssWidth half-container CSS width (one eye)
 * @param {number} eyeCssHeight container CSS height
 * @param {number} pixelRatio safe output pixel ratio
 */
export function computeEyeRttSize(renderer, eyeCssWidth, eyeCssHeight, pixelRatio) {
  const gl = renderer.getContext();
  const cap = getGpuDimensionCap(gl);
  const supersample = getEyeRttSupersample();
  let w = Math.floor(eyeCssWidth * pixelRatio * supersample);
  let h = Math.floor(eyeCssHeight * pixelRatio * supersample);
  w = Math.max(1, Math.min(w, cap));
  h = Math.max(1, Math.min(h, cap));
  return { width: w, height: h };
}

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {number} width
 * @param {number} height
 */
export function getEyeRttMsaaSamples(renderer) {
  const maxSamples = renderer.capabilities.maxSamples || 0;
  if (maxSamples <= 0) return 0;
  const target = isMobileViewport() ? 2 : 4;
  return Math.min(target, maxSamples);
}

export function createEyeRenderTarget(renderer, width, height) {
  const samples = getEyeRttMsaaSamples(renderer);
  return new THREE.WebGLRenderTarget(width, height, {
    colorSpace: THREE.SRGBColorSpace,
    depthBuffer: true,
    stencilBuffer: false,
    samples,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
  });
}

/**
 * @param {THREE.Texture} texture
 * @param {THREE.WebGLRenderer} [renderer]
 */
export function applyHighQualityTexture(texture, renderer = null) {
  const aniso = renderer ? renderer.capabilities.getMaxAnisotropy() : _maxAnisotropy;
  texture.anisotropy = aniso;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}