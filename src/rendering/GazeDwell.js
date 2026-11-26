import * as THREE from 'three';

export const GAZE_DWELL_MS = 3000;

export class GazeDwellSystem {
  constructor(camera, scene, domElement) {
    this.camera = camera;
    this.scene = scene;
    this.dom = domElement;
    this.raycaster = new THREE.Raycaster();
    this.dwellMs = GAZE_DWELL_MS;
    this.activeTarget = null;
    this.progress = 0;
    this._startTime = null;
    this._onDwell = null;
    this._ndc = new THREE.Vector2(0, 0);
    this._fallbackClick = this._fallbackClick.bind(this);
    domElement.addEventListener('click', this._fallbackClick);
    domElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (this.activeTarget && this._onDwell) {
          this._onDwell(this.activeTarget);
        }
      }
    });
  }

  setOnDwell(fn) {
    this._onDwell = fn;
  }

  _fallbackClick() {
    if (this.activeTarget && this._onDwell) {
      this._onDwell(this.activeTarget);
    }
  }

  update(deltaMs, interactables) {
    this.raycaster.setFromCamera(this._ndc, this.camera);
    const hits = this.raycaster.intersectObjects(interactables, false);
    const hit = hits[0]?.object ?? null;

    if (hit !== this.activeTarget) {
      this.activeTarget = hit;
      this._startTime = hit ? performance.now() : null;
      this.progress = 0;
    } else if (hit && this._startTime !== null) {
      const elapsed = performance.now() - this._startTime;
      this.progress = Math.min(1, elapsed / this.dwellMs);
      if (elapsed >= this.dwellMs && this._onDwell) {
        const target = hit;
        this._startTime = null;
        this.progress = 0;
        this._onDwell(target);
      }
    }
    return { progress: this.progress, target: this.activeTarget };
  }

  dispose() {
    this.dom.removeEventListener('click', this._fallbackClick);
  }
}