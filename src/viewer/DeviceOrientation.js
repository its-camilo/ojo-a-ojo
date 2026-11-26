import * as THREE from 'three';
import {
  deviceOrientationToQuaternion,
  getScreenOrientationRadians,
  readOrientationRadians,
} from './deviceOrientationMath.js';

/** Permiso iOS concedido en esta pestaña (persiste tras el primer grant). */
let iosPermissionGrantedSession = false;

const SIGNAL_TIMEOUT_MS = 1200;

export class DeviceOrientationController {
  constructor(domElement) {
    this.dom = domElement ?? null;
    this.enabled = false;
    this.permissionState = 'unknown'; // unknown | granted | denied | prompt
    this.quaternion = new THREE.Quaternion();
    this._handler = this._onDeviceOrientation.bind(this);
    this._screenHandler = () => {
      this._screenAngleRad = getScreenOrientationRadians();
    };
    this._screenAngleRad = getScreenOrientationRadians();
    this._yawOffsetRad = null;
    this._lastEventAt = 0;
    this._lastAlphaDeg = null;
    this._lastBetaDeg = null;
    this._lastGammaDeg = null;
    this._attached = false;
    this._touchFallback = false;
    this._dragYaw = 0;
    this._dragPitch = 0;
    this._isDragging = false;
    this._lastX = 0;
    this._lastY = 0;
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._extraEuler = new THREE.Euler();
    this._extraQuat = new THREE.Quaternion();
    if (this.dom) {
      this.dom.addEventListener('pointerdown', this._onPointerDown);
      window.addEventListener('pointerup', this._onPointerUp);
      window.addEventListener('pointermove', this._onPointerMove);
    }
    window.addEventListener('orientationchange', this._screenHandler);
    window.screen?.orientation?.addEventListener?.('change', this._screenHandler);
  }

  static needsPermission() {
    return (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    );
  }

  /**
   * Llamar sincrónicamente dentro del gesto del usuario (click/touchend).
   * @returns {Promise<string>|null} null si no hace falta popup iOS
   */
  static capturePermissionFromGesture() {
    if (!DeviceOrientationController.needsPermission()) {
      return null;
    }
    if (iosPermissionGrantedSession) {
      return Promise.resolve('granted');
    }
    return DeviceOrientationEvent.requestPermission();
  }

  /**
   * Activa escucha de deviceorientation tras permiso (o sin él en Android/desktop).
   * @param {{ permissionPromise?: Promise<string>|null, assumeGranted?: boolean }} [opts]
   */
  async activate(opts = {}) {
    const { permissionPromise = null, assumeGranted = false } = opts;

    if (DeviceOrientationController.needsPermission()) {
      if (permissionPromise) {
        try {
          const res = await permissionPromise;
          if (res === 'granted') {
            iosPermissionGrantedSession = true;
            this.permissionState = 'granted';
          } else {
            this.permissionState = 'denied';
            return false;
          }
        } catch {
          this.permissionState = 'denied';
          return false;
        }
      } else if (iosPermissionGrantedSession || assumeGranted) {
        this.permissionState = 'granted';
      } else {
        this.permissionState = 'prompt';
        return false;
      }
    } else {
      this.permissionState = 'granted';
    }

    this.attachListeners();
    return true;
  }

  /** @deprecated usar activate(); mantenido por compatibilidad */
  async requestPermission() {
    const perm = DeviceOrientationController.capturePermissionFromGesture();
    return this.activate({ permissionPromise: perm });
  }

  attachListeners() {
    if (this._attached) return;
    this._attached = true;
    this.enabled = true;
    window.addEventListener('deviceorientation', this._handler, true);
    this._screenHandler();
  }

  _onDeviceOrientation(e) {
    if (!this.enabled) return;
    if (e.alpha == null && e.beta == null && e.gamma == null) return;

    const { alpha, beta, gamma } = readOrientationRadians(e);
    this._lastAlphaDeg = e.alpha;
    this._lastBetaDeg = e.beta;
    this._lastGammaDeg = e.gamma;
    this._lastEventAt = performance.now();

    let yaw = alpha;
    if (this._yawOffsetRad != null) {
      yaw = alpha - this._yawOffsetRad;
    }

    deviceOrientationToQuaternion(yaw, beta, gamma, this._screenAngleRad, this.quaternion);
    this._touchFallback = false;
  }

  recenter() {
    if (this._lastEventAt > 0 && this._lastAlphaDeg != null) {
      this._yawOffsetRad = readOrientationRadians({
        alpha: this._lastAlphaDeg,
        beta: this._lastBetaDeg ?? 0,
        gamma: this._lastGammaDeg ?? 0,
      }).alpha;
    } else {
      this._yawOffsetRad = 0;
    }
    this._dragYaw = 0;
    this._dragPitch = 0;
  }

  hasRecentSignal(maxAgeMs = SIGNAL_TIMEOUT_MS) {
    if (!this.enabled) return false;
    return this._lastEventAt > 0 && performance.now() - this._lastEventAt < maxAgeMs;
  }

  getLiveStatus() {
    if (this.permissionState === 'denied') {
      return { text: 'Permiso denegado', kind: 'denied' };
    }
    if (!this.enabled) {
      return { text: 'Giroscopio inactivo — toque Activar', kind: 'inactive' };
    }
    if (!this.hasRecentSignal(SIGNAL_TIMEOUT_MS * 4)) {
      if (this._lastEventAt === 0) {
        return { text: 'Sin señal (mueva el dispositivo)', kind: 'no-signal' };
      }
      return { text: 'Sin señal reciente', kind: 'no-signal' };
    }
    const a = this._lastAlphaDeg?.toFixed(0) ?? '—';
    const b = this._lastBetaDeg?.toFixed(0) ?? '—';
    const g = this._lastGammaDeg?.toFixed(0) ?? '—';
    return {
      text: `Permiso concedido · α ${a}° · β ${b}° · γ ${g}°`,
      kind: 'live',
    };
  }

  enableTouchFallback() {
    this._touchFallback = true;
  }

  _onPointerDown(e) {
    if (!this._touchFallback && this.hasRecentSignal()) return;
    if (e.isPrimary === false) return;
    this._isDragging = true;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.dom?.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this._isDragging) return;
    const dx = e.clientX - this._lastX;
    const dy = e.clientY - this._lastY;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this._dragYaw -= dx * 0.005;
    this._dragPitch -= dy * 0.005;
    this._dragPitch = Math.max(-1.2, Math.min(1.2, this._dragPitch));
  }

  _onPointerUp() {
    this._isDragging = false;
  }

  applyToObject(object3d) {
    const useGyro =
      this.enabled && this._lastEventAt > 0 && !this._touchFallback;

    if (useGyro) {
      object3d.quaternion.copy(this.quaternion);
      if (this._dragYaw !== 0 || this._dragPitch !== 0) {
        this._extraEuler.set(this._dragPitch, this._dragYaw, 0, 'YXZ');
        this._extraQuat.setFromEuler(this._extraEuler);
        object3d.quaternion.multiply(this._extraQuat);
      }
      return;
    }

    if (this._touchFallback || this.enabled) {
      object3d.rotation.set(this._dragPitch, this._dragYaw, 0, 'YXZ');
    }
  }

  dispose() {
    window.removeEventListener('deviceorientation', this._handler, true);
    window.removeEventListener('orientationchange', this._screenHandler);
    window.screen?.orientation?.removeEventListener?.('change', this._screenHandler);
    if (this.dom) {
      this.dom.removeEventListener('pointerdown', this._onPointerDown);
    }
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointermove', this._onPointerMove);
    this.enabled = false;
    this._attached = false;
  }
}

export { iosPermissionGrantedSession };