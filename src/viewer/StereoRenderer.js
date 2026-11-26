import * as THREE from 'three';
import composeVert from '../shaders/stereo-compose.vert.glsl?raw';
import composeFrag from '../shaders/stereo-compose.frag.glsl?raw';
import { injectColorOps, prepareGlslForThree } from '../utils/shaderBuild.js';

const LAYER_LEFT = 1;
const LAYER_RIGHT = 2;
const LAYER_BOTH = 3;

export class StereoRenderer {
  constructor(container, calibration, options = {}) {
    this.container = container;
    this.calibration = calibration;
    this.viewMode = options.viewMode ?? 0;
    this.mode = options.mode ?? 'desktop';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f18);

    this.head = new THREE.Group();
    this.scene.add(this.head);

    const aspect = this._eyeAspect();
    const fov = 75;
    this.cameraLeft = new THREE.PerspectiveCamera(fov, aspect, 0.05, 200);
    this.cameraRight = new THREE.PerspectiveCamera(fov, aspect, 0.05, 200);
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight, false);
    this.renderer.domElement.classList.add('viewer-canvas');
    container.appendChild(this.renderer.domElement);

    const w = Math.floor(container.clientWidth / 2);
    const h = container.clientHeight;
    this.rtLeft = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace });
    this.rtRight = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace });

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

  _eyeAspect() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    return w / 2 / h;
  }

  _createReticle() {
    const group = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.08, 0.1, 48);
    const dotGeo = new THREE.CircleGeometry(0.012, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, mat);
    const dot = new THREE.Mesh(dotGeo, mat.clone());
    ring.position.z = -0.5;
    dot.position.z = -0.5;
    group.add(ring, dot);
    group.userData.reticleRing = ring;
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

  setReticleProgress(t) {
    const ring = this.reticle.userData.reticleRing;
    if (ring) {
      ring.scale.setScalar(1 + t * 0.35);
      ring.material.opacity = 0.5 + t * 0.5;
    }
  }

  render() {
    const w = Math.floor(this.container.clientWidth / 2);
    const h = this.container.clientHeight;
    this.rtLeft.setSize(w, h);
    this.rtRight.setSize(w, h);

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