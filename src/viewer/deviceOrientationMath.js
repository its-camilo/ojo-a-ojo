import * as THREE from 'three';

const _euler = new THREE.Euler();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _screenTurn = new THREE.Quaternion();
/** Rotación -π/2 en X: convención Three.js / DeviceOrientationControls */
const _cameraUpFix = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

/** Ganancia angular respecto al frente recentrado (1 = sin atenuación). */
export const GYRO_ANGULAR_GAIN = 0.68;

/**
 * Cuaternión de orientación del dispositivo (α, β, γ en rad) con compensación de pantalla.
 * @param {number} alpha
 * @param {number} beta
 * @param {number} gamma
 * @param {number} screenAngleRad ángulo de pantalla en radianes
 * @param {THREE.Quaternion} [target]
 */
export function deviceOrientationToQuaternion(alpha, beta, gamma, screenAngleRad, target = new THREE.Quaternion()) {
  _euler.set(beta, alpha, -gamma, 'YXZ');
  target.setFromEuler(_euler);
  target.multiply(_cameraUpFix);
  _screenTurn.setFromAxisAngle(_zAxis, -screenAngleRad);
  target.multiply(_screenTurn);
  return target;
}

export function getScreenOrientationRadians() {
  if (typeof window !== 'undefined' && window.screen?.orientation?.angle != null) {
    return THREE.MathUtils.degToRad(window.screen.orientation.angle);
  }
  if (typeof window !== 'undefined' && typeof window.orientation === 'number') {
    return THREE.MathUtils.degToRad(window.orientation);
  }
  return 0;
}

/** @param {DeviceOrientationEvent} e */
export function readOrientationRadians(e) {
  return {
    alpha: THREE.MathUtils.degToRad(e.alpha ?? 0),
    beta: THREE.MathUtils.degToRad(e.beta ?? 0),
    gamma: THREE.MathUtils.degToRad(e.gamma ?? 0),
  };
}

/**
 * Orientación efectiva tras recentrar: deltas escalados por GYRO_ANGULAR_GAIN.
 * @param {{ alpha: number, beta: number, gamma: number }} raw rad
 * @param {{ alpha: number, beta: number, gamma: number }|null} baseline rad en recentrado
 */
export function orientationWithGain(raw, baseline) {
  if (!baseline) return raw;
  return {
    alpha: (raw.alpha - baseline.alpha) * GYRO_ANGULAR_GAIN,
    beta: (raw.beta - baseline.beta) * GYRO_ANGULAR_GAIN,
    gamma: (raw.gamma - baseline.gamma) * GYRO_ANGULAR_GAIN,
  };
}