import { StereoRenderer } from './StereoRenderer.js';
import { GazeDwellSystem } from './GazeDwell.js';
import { DesktopControls } from './DesktopControls.js';
import { DeviceOrientationController } from './DeviceOrientation.js';
import { Module1Balance } from '../modules/Module1Balance.js';
import { Module2HollowMask } from '../modules/Module2HollowMask.js';
import { Module3Ames } from '../modules/Module3Ames.js';
import { Module4RDS } from '../modules/Module4RDS.js';
import { recordModuleResult } from '../app/state.js';

const MODULE_IDS = ['balance', 'hollow-mask', 'ames', 'rds'];

export class ViewerSession {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.stereo = new StereoRenderer(container, options.calibration, {
      viewMode: options.viewMode,
      mode: options.mode,
    });
    this.activeModule = null;
    this.controls =
      options.mode === 'desktop'
        ? new DesktopControls(this.stereo.domElement)
        : new DeviceOrientationController();
    this.gaze = new GazeDwellSystem(this.stereo.camera, this.stereo.scene, this.stereo.domElement);
    this.gaze.setOnDwell((mesh) => {
      if (this.activeModule?.onGazeSelect) this.activeModule.onGazeSelect(mesh);
    });
    this._raf = null;
    this._last = performance.now();
  }

  startModule(moduleId, onModuleDone) {
    this.stopModule();
    this.onModuleDone = onModuleDone;
    const cal = this.options.calibration;
    const monoOnly = false;

    const complete = (payload) => {
      recordModuleResult(payload.moduleId, payload);
      this.stopModule();
      onModuleDone(payload);
    };

    switch (moduleId) {
      case 'balance':
        this.activeModule = new Module1Balance(this.stereo, complete);
        break;
      case 'hollow-mask':
        this.activeModule = new Module2HollowMask(this.stereo, monoOnly, complete);
        break;
      case 'ames':
        this.activeModule = new Module3Ames(this.stereo, monoOnly, complete);
        break;
      case 'rds':
        this.activeModule = new Module4RDS(this.stereo, cal, monoOnly, complete);
        break;
      default:
        return;
    }
    this.activeModule.mount();
    this._loop();
  }

  stopModule() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this.activeModule) {
      this.activeModule.unmount();
      this.activeModule = null;
    }
  }

  _loop() {
    const now = performance.now();
    const delta = now - this._last;
    this._last = now;

    if (this.options.mode === 'desktop' && this.controls.applyToObject) {
      this.controls.applyToObject(this.stereo.head);
    } else if (this.controls.applyToObject) {
      this.controls.applyToObject(this.stereo.head);
    }

    const interactables = this.activeModule?.getInteractables?.() ?? [];
    const dwell = this.gaze.update(delta, interactables);
    this.stereo.setReticleProgress(dwell.progress);
    this.stereo.render();

    this._raf = requestAnimationFrame(() => this._loop());
  }

  dispose() {
    this.stopModule();
    this.gaze.dispose();
    this.controls.dispose?.();
    this.stereo.dispose();
  }
}

export { MODULE_IDS };