import * as THREE from 'three';

const _euler = new THREE.Euler();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _screenTurn = new THREE.Quaternion();
/** Rotación -π/2 en X: convención Three.js / DeviceOrientationControls */
const _cameraUpFix = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

const _qDevice = new THREE.Quaternion();
const _axis = new THREE.Vector3();

/** Ganancia angular sobre el delta de orientación (recentrado). */
export const GYRO_ANGULAR_GAIN = 0.35;

/** Zona muerta en grados para temblor de mano. */
export const GYRO_DEAD_ZONE_DEG = 0.15;

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

/**
 * Ángulo de pantalla en radianes. En Cardboard/iOS asume landscape (90°) si el viewport es ancho
 * y el SO reporta 0° (común en Safari con el teléfono ya en horizontal).
 */
export function getScreenOrientationRadians() {
  if (typeof window === 'undefined') return 0;

  let angleDeg = 0;
  if (window.screen?.orientation?.angle != null) {
    angleDeg = window.screen.orientation.angle;
  } else if (typeof window.orientation === 'number') {
    angleDeg = window.orientation;
  }

  if (angleDeg === 0 || angleDeg === 180) {
    const isMobile =
      typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const vw = Math.max(window.innerWidth, window.innerHeight);
    const vh = Math.min(window.innerWidth, window.innerHeight);
    if (isMobile && vw > vh * 1.05) {
      return THREE.MathUtils.degToRad(90);
    }
  }

  return THREE.MathUtils.degToRad(angleDeg);
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
 * Orientación relativa al recentrado vía cuaterniones (sin restar Euler).
 * @param {{ alpha: number, beta: number, gamma: number }} raw rad
 * @param {THREE.Quaternion|null} qBaselineInv inverso del cuaternión en recentrado; null = sin compensar
 * @param {number} screenAngleRad
 * @param {THREE.Quaternion} target
 */
export function relativeOrientationQuaternion(raw, qBaselineInv, screenAngleRad, target) {
  deviceOrientationToQuaternion(raw.alpha, raw.beta, raw.gamma, screenAngleRad, _qDevice);

  if (!qBaselineInv) {
    target.identity();
    return target;
  }

  target.copy(qBaselineInv).multiply(_qDevice);
  if (target.w < 0) {
    target.x *= -1;
    target.y *= -1;
    target.z *= -1;
    target.w *= -1;
  }

  const sinHalf = Math.sqrt(target.x * target.x + target.y * target.y + target.z * target.z);
  let angleRad = 2 * Math.atan2(sinHalf, Math.abs(target.w));
  const angleDeg = THREE.MathUtils.radToDeg(angleRad);

  if (angleDeg < GYRO_DEAD_ZONE_DEG) {
    target.identity();
    return target;
  }

  angleRad *= GYRO_ANGULAR_GAIN;
  if (sinHalf < 1e-8) {
    target.identity();
    return target;
  }

  _axis.set(target.x / sinHalf, target.y / sinHalf, target.z / sinHalf);
  target.setFromAxisAngle(_axis, angleRad);
  return target;
}