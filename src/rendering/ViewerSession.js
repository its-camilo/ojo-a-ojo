import * as THREE from 'three';
import { StereoRenderer } from './StereoRenderer.js';
import { GazeDwellSystem } from './GazeDwell.js';
import { DeviceOrientationController } from '../services/deviceOrientation.js';
import { createSceneModule, MODULE_IDS } from '../domain/moduleRegistry.js';
import { recordModuleResult } from '../domain/sessionState.js';

const GYRO_SIGNAL_CHECK_MS = 1200;

export class ViewerSession {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    const mode = options.mode === 'desktop' ? 'cardboard' : options.mode || 'cardboard';
    this.options.mode = mode;

    this.stereo = new StereoRenderer(container, options.calibration, {
      viewMode: options.viewMode,
      mode,
    });
    this.activeModule = null;
    this.controls = new DeviceOrientationController(container);
    this.gaze = new GazeDwellSystem(this.stereo.camera, this.stereo.scene, this.stereo.domElement);
    this.gaze.setOnDwell((mesh) => {
      if (this.activeModule?.onGazeSelect) this.activeModule.onGazeSelect(mesh);
    });
    this._raf = null;
    this._last = performance.now();
    this._gyroSignalTimer = null;
    this.onGyroOverlayNeeded = options.onGyroOverlayNeeded ?? null;
    this._gazeHighlight = null;
  }

  async activateGyro(gyroOpts = {}) {
    if (!(this.controls instanceof DeviceOrientationController)) return true;

    const ok = await this.controls.activate(gyroOpts);
    if (ok) {
      this.controls.recenter();
      this._scheduleGyroSignalCheck();
    } else {
      this.onGyroOverlayNeeded?.('permission');
      this.controls.enableTouchFallback();
    }
    return ok;
  }

  _scheduleGyroSignalCheck() {
    if (this._gyroSignalTimer) clearTimeout(this._gyroSignalTimer);
    this._gyroSignalTimer = setTimeout(() => {
      if (!(this.controls instanceof DeviceOrientationController)) return;
      if (!this.controls.hasRecentSignal(GYRO_SIGNAL_CHECK_MS)) {
        this.controls.enableTouchFallback();
        this.onGyroOverlayNeeded?.('no-signal');
      }
    }, GYRO_SIGNAL_CHECK_MS);
  }

  startModule(moduleId, onModuleDone) {
    this.stopModule();
    this.onModuleDone = onModuleDone;
    const cal = this.options.calibration;
    const monoOnly = false;

    const complete = (payload) => {
      try {
        recordModuleResult(payload.moduleId, payload);
      } finally {
        this.stopModule();
        onModuleDone(payload);
      }
    };

    this.activeModule = createSceneModule(moduleId, {
      stereo: this.stereo,
      complete,
      monoOnly,
      cal,
    });
    if (!this.activeModule) return;

    this.stereo.scene.environment = null;
    this.stereo.renderer.toneMappingExposure = 0.92;
    this.activeModule.mount();
    if (this.controls instanceof DeviceOrientationController) {
      requestAnimationFrame(() => this.controls.recenter());
    }
    this._loop();
  }

  recenterGyro() {
    if (this.controls instanceof DeviceOrientationController) {
      this.controls.recenter();
    }
  }

  _resetGazeHighlight(mesh) {
    if (!mesh?.userData?.gazeButton) return;
    if (mesh.userData._baseScale != null) mesh.scale.setScalar(mesh.userData._baseScale);
    if (mesh.material && mesh.userData._baseColor != null) mesh.material.color.setHex(mesh.userData._baseColor);
    if (mesh.material) mesh.material.opacity = 1;
  }

  _clearGazeHighlight() {
    if (this._gazeHighlight) this._resetGazeHighlight(this._gazeHighlight);
    this._gazeHighlight = null;
  }

  _applyGazeFeedback(dwell) {
    const target = dwell.target;
    const progress = dwell.progress;
    if (this._gazeHighlight && this._gazeHighlight !== target) {
      this._resetGazeHighlight(this._gazeHighlight);
      this._gazeHighlight = null;
    }
    if (!target?.userData?.gazeButton) return;
    this._gazeHighlight = target;
    if (target.userData._baseScale == null) target.userData._baseScale = target.scale.x;
    if (target.userData._baseColor == null && target.material?.color) {
      target.userData._baseColor = target.material.color.getHex();
    }
    target.scale.setScalar(target.userData._baseScale * (1 + progress * 0.08));
    if (target.material?.color) {
      const glow = 0.55 + progress * 0.45;
      target.material.color.setRGB(glow, glow, Math.min(1, glow + 0.08));
    }
    if (target.material) target.material.opacity = 0.94 + progress * 0.06;
  }

  stopModule() {
    if (this._gyroSignalTimer) {
      clearTimeout(this._gyroSignalTimer);
      this._gyroSignalTimer = null;
    }
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._clearGazeHighlight();
    if (this.activeModule) {
      this.activeModule.unmount();
      this.activeModule = null;
    }
    this.stereo.scene.environment = null;
    this.stereo.setReticleProgress(0, false);
  }

  _loop() {
    const now = performance.now();
    const delta = now - this._last;
    this._last = now;

    if (this.controls.applyToObject) {
      this.controls.applyToObject(this.stereo.head);
    }

    const interactables = this.activeModule?.getInteractables?.() ?? [];
    const dwell = this.gaze.update(delta, interactables);
    this._applyGazeFeedback(dwell);
    this.stereo.setReticleProgress(dwell.progress, Boolean(dwell.target));
    this.stereo.render();

    this._raf = requestAnimationFrame(() => this._loop());
  }

  completeForE2e() {
    this.activeModule?.completeForE2e?.();
  }

  projectToNdc(object3d) {
    this.stereo.head.updateMatrixWorld(true);
    object3d.updateMatrixWorld(true);
    this.stereo.cameraLeft.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    object3d.getWorldPosition(v);
    v.project(this.stereo.cameraLeft);
    return { x: v.x, y: v.y, z: v.z };
  }

  dispose() {
    this.stopModule();
    this.gaze.dispose();
    this.controls.dispose?.();
    this.stereo.dispose();
  }
}

export { MODULE_IDS };