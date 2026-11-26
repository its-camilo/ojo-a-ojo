export class DeviceOrientationController {
  constructor() {
    this.enabled = false;
    this.quaternion = { x: 0, y: 0, z: 0, w: 1 };
    this._handler = this._onDeviceOrientation.bind(this);
  }

  static needsPermission() {
    return (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    );
  }

  async requestPermission() {
    if (!DeviceOrientationController.needsPermission()) {
      this.enabled = true;
      window.addEventListener('deviceorientation', this._handler, true);
      return true;
    }
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res === 'granted') {
        this.enabled = true;
        window.addEventListener('deviceorientation', this._handler, true);
        return true;
      }
    } catch {
      /* user denied */
    }
    return false;
  }

  _onDeviceOrientation(e) {
    if (!this.enabled) return;
    const alpha = (e.alpha || 0) * (Math.PI / 180);
    const beta = (e.beta || 0) * (Math.PI / 180);
    const gamma = (e.gamma || 0) * (Math.PI / 180);
    this.euler = { alpha, beta, gamma };
  }

  dispose() {
    window.removeEventListener('deviceorientation', this._handler, true);
    this.enabled = false;
  }

  applyToObject(object3d) {
    if (!this.enabled || !this.euler) return;
    const { alpha, beta, gamma } = this.euler;
    object3d.rotation.set(beta, alpha, -gamma, 'YXZ');
  }
}