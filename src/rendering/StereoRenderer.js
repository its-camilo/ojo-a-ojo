import * as THREE from 'three';
import composeVert from '../shaders/stereo-compose.vert.glsl?raw';
import composeFrag from '../shaders/stereo-compose.frag.glsl?raw';
import { injectColorOps, prepareGlslForThree } from './shaderBuild.js';
import {
  bindRendererQuality,
  computeSafePixelRatio,
  computeEyeRttSize,
  createEyeRenderTarget,
  getEyeRttSupersample,
  getGpuDimensionCap,
  isMobileViewport,
} from './renderQuality.js';

const LAYER_LEFT = 1;
const LAYER_RIGHT = 2;
const LAYER_BOTH = 3;

export class StereoRenderer {
  constructor(container, calibration, options = {}) {
    this.container = container;
    this.calibration = calibration;
    this.viewMode = options.viewMode ?? 0;
    this.mode = options.mode ?? 'cardboard';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f18);

    this.head = new THREE.Group();
    this.scene.add(this.head);

    const aspect = this._eyeAspect();
    const fov = 75;
    this.cameraLeft = new THREE.PerspectiveCamera(fov, aspect, 0.15, 200);
    this.cameraRight = new THREE.PerspectiveCamera(fov, aspect, 0.15, 200);
    this.cameraLeft.layers.enable(LAYER_LEFT);
    this.cameraLeft.layers.enable(LAYER_BOTH);
    this.cameraRight.layers.enable(LAYER_RIGHT);
    this.cameraRight.layers.enable(LAYER_BOTH);

    this.head.add(this.cameraLeft);
    this.head.add(this.cameraRight);
    this._updateCameraOffsets(0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    bindRendererQuality(this.renderer);

    const cssW = container.clientWidth || window.innerWidth;
    const cssH = container.clientHeight || window.innerHeight;
    this.pixelRatio = computeSafePixelRatio(this.renderer, cssW, cssH);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(cssW, cssH, false);
    this.renderer.domElement.classList.add('viewer-canvas');
    container.appendChild(this.renderer.domElement);

    const gl = this.renderer.getContext();
    this.gpuCap = getGpuDimensionCap(gl);
    const eyeCssW = cssW / 2;
    const { width: rtw, height: rth } = computeEyeRttSize(
      this.renderer,
      eyeCssW,
      cssH,
      this.pixelRatio
    );
    this.eyeRttWidth = rtw;
    this.eyeRttHeight = rth;
    this.msaaSamples = this._rttSamples();

    this.rtLeft = createEyeRenderTarget(this.renderer, rtw, rth);
    this.rtRight = createEyeRenderTarget(this.renderer, rtw, rth);

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.composeMaterial = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: prepareGlslForThree(composeVert),
      fragmentShader: injectColorOps(composeFrag),
      uniforms: {
        mapLeft: { value: this.rtLeft.texture },
        mapRight: { value: this.rtRight.texture },
        k1: { value: calibration.k1 },
        k2: { value: calibration.k2 },
        viewMode: { value: this.viewMode },
        layoutSplit: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.composeScene = new THREE.Scene();
    this.composeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(quadGeo, this.composeMaterial);
    this.composeScene.add(quad);

    this.reticle = this._createReticle();
    this.head.add(this.reticle);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
    this._applyModeLayout();
  }

  _rttSamples() {
    const maxSamples = this.renderer.capabilities.maxSamples || 0;
    return maxSamples > 0 ? Math.min(4, maxSamples) : 0;
  }

  /** Exposed for PR / diagnostics */
  getQualityStats() {
    return {
      devicePixelRatio: window.devicePixelRatio || 1,
      pixelRatio: this.pixelRatio,
      eyeRttWidth: this.eyeRttWidth,
      eyeRttHeight: this.eyeRttHeight,
      rttSupersample: getEyeRttSupersample(),
      mobileProfile: isMobileViewport(),
      msaaSamples: this.msaaSamples,
      maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
      gpuDimensionCap: this.gpuCap,
    };
  }

  _eyeAspect() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    return w / 2 / h;
  }

  _createReticle() {
    const group = new THREE.Group();
    const depth = 0.85;
    const hud = {
      transparent: true,
      depthTest: false,
      depthWrite: false,
    };
    const guide = new THREE.Mesh(
      new THREE.RingGeometry(0.015, 0.0175, 64),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, opacity: 0.4, ...hud })
    );
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.0035, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.95, ...hud })
    );
    const progressMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      opacity: 0.92,
      side: THREE.DoubleSide,
      ...hud,
    });
    for (const part of [guide, dot]) {
      part.position.z = -depth;
      part.renderOrder = 10000;
      part.layers.enable(LAYER_BOTH);
      group.add(part);
    }
    group.userData = {
      reticleDepth: depth,
      reticleDot: dot,
      reticleGuide: guide,
      reticleProgressMat: progressMat,
      reticleProgressMesh: null,
      reticleProgressStep: -1,
    };
    group.renderOrder = 10000;
    return group;
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.composeMaterial.uniforms.viewMode.value = mode;
  }

  setCalibration(cal) {
    this.calibration = cal;
    this.composeMaterial.uniforms.k1.value = cal.k1;
    this.composeMaterial.uniforms.k2.value = cal.k2;
  }

  setMono(mono) {
    this._updateCameraOffsets(mono ? 0 : this._ipdMeters());
  }

  _ipdMeters() {
    return (this.calibration.ipdMm || 63.9) / 1000;
  }

  _updateCameraOffsets(halfIpd) {
    this.cameraLeft.position.set(-halfIpd, 0, 0);
    this.cameraRight.position.set(halfIpd, 0, 0);
    const conv = 2.5;
    this.cameraLeft.lookAt(-halfIpd, 0, -conv);
    this.cameraRight.lookAt(halfIpd, 0, -conv);
  }

  _applyModeLayout() {
    if (this.mode === 'cardboard') {
      this.container.classList.add('viewer--landscape');
      void this.renderer.domElement.requestFullscreen?.().catch(() => {});
    }
  }

  get domElement() {
    return this.renderer.domElement;
  }

  get camera() {
    return this.cameraLeft;
  }

  addToScene(object) {
    this.scene.add(object);
  }

  removeFromScene(object) {
    this.scene.remove(object);
  }

  setReticleProgress(t, targeting = false) {
    const ud = this.reticle.userData;
    const step = Math.floor(t * 16);
    if (step !== ud.reticleProgressStep) {
      ud.reticleProgressStep = step;
      if (ud.reticleProgressMesh) {
        this.reticle.remove(ud.reticleProgressMesh);
        ud.reticleProgressMesh.geometry.dispose();
        ud.reticleProgressMesh = null;
      }
      if (t > 0.02 && targeting) {
        const geo = new THREE.RingGeometry(
          0.015,
          0.0195,
          48,
          1,
          -Math.PI / 2,
          Math.max(0.05, t) * Math.PI * 2
        );
        const mesh = new THREE.Mesh(geo, ud.reticleProgressMat);
        mesh.position.z = -ud.reticleDepth;
        mesh.renderOrder = 10001;
        mesh.layers.enable(LAYER_BOTH);
        this.reticle.add(mesh);
        ud.reticleProgressMesh = mesh;
      }
    }
    if (ud.reticleDot) {
      ud.reticleDot.material.opacity = targeting ? 1 : 0.92;
      ud.reticleDot.scale.setScalar(1 + (targeting ? t * 0.12 : 0));
    }
    if (ud.reticleGuide) {
      ud.reticleGuide.material.opacity = targeting ? 0.55 + t * 0.35 : 0.4;
    }
  }

  _syncRttSizes() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;

    this.pixelRatio = computeSafePixelRatio(this.renderer, w, h);
    this.renderer.setPixelRatio(this.pixelRatio);

    const { width: rtw, height: rth } = computeEyeRttSize(this.renderer, w / 2, h, this.pixelRatio);
    this.eyeRttWidth = rtw;
    this.eyeRttHeight = rth;
    this.rtLeft.setSize(rtw, rth);
    this.rtRight.setSize(rtw, rth);
  }

  render() {
    this._syncRttSizes();

    this.renderer.setRenderTarget(this.rtLeft);
    this.renderer.clear();
    this.renderer.render(this.scene, this.cameraLeft);

    this.renderer.setRenderTarget(this.rtRight);
    this.renderer.clear();
    this.renderer.render(this.scene, this.cameraRight);

    this.renderer.setRenderTarget(null);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, false);
    this.renderer.render(this.composeScene, this.composeCam);
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    const aspect = this._eyeAspect();
    this.cameraLeft.aspect = aspect;
    this.cameraRight.aspect = aspect;
    this.cameraLeft.updateProjectionMatrix();
    this.cameraRight.updateProjectionMatrix();
    this.pixelRatio = computeSafePixelRatio(this.renderer, w, h);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.rtLeft.dispose();
    this.rtRight.dispose();
    this.composeMaterial.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export { LAYER_LEFT, LAYER_RIGHT, LAYER_BOTH };