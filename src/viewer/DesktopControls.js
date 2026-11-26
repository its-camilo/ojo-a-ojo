export class DesktopControls {
  constructor(domElement) {
    this.dom = domElement;
    this.isDragging = false;
    this.yaw = 0;
    this.pitch = 0;
    this._lastX = 0;
    this._lastY = 0;
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKey = this._onKey.bind(this);
    domElement.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('keydown', this._onKey);
  }

  _onPointerDown(e) {
    this.isDragging = true;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.dom.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this._lastX;
    const dy = e.clientY - this._lastY;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.yaw -= dx * 0.005;
    this.pitch -= dy * 0.005;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
  }

  _onPointerUp() {
    this.isDragging = false;
  }

  _onKey(e) {
    const step = 0.08;
    if (e.key === 'ArrowLeft') this.yaw += step;
    if (e.key === 'ArrowRight') this.yaw -= step;
    if (e.key === 'ArrowUp') this.pitch += step;
    if (e.key === 'ArrowDown') this.pitch -= step;
  }

  applyToObject(object3d) {
    object3d.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  dispose() {
    this.dom.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('keydown', this._onKey);
  }
}