import * as THREE from 'three';
import { createGazeButton } from '../rendering/gazeButton.js';

/** Valores por defecto (balance / RDS y fallback). */
export const UI_RING_Z = -2.08;
export const UI_SIDE_X = 0.78;
export const UI_SIDE_Y = -0.2;
export const UI_THIRD_Y = -0.46;

const PRESETS = {
  /** Máscara: más separación lateral para no tapar la mandíbula. */
  hollow: { sideX: UI_SIDE_X + 0.16, sideY: UI_SIDE_Y, ringZ: UI_RING_Z, width: 1.02, height: 0.34 },
  /** Balance: laterales más afuera y «Equilibrado» más abajo (tubo izquierdo). */
  balance: {
    sideX: UI_SIDE_X + 0.15,
    sideY: UI_SIDE_Y,
    thirdY: UI_THIRD_Y - 0.1,
    ringZ: UI_RING_Z,
    width: 1.02,
    height: 0.34,
  },
  /** Cuarto de Ames: fila compacta bajo las figuras, sin tapar roja/azul. */
  ames: {
    sideX: 0.58,
    sideY: -0.56,
    thirdY: -0.66,
    ringZ: -2.02,
    width: 1.02 * 0.8,
    height: 0.34 * 0.8,
  },
};

/**
 * Coloca botones en arco alrededor del estímulo.
 * @param {Array<{ label: string, onSelect: () => void, options?: object }>} specs
 * @param {{ preset?: keyof typeof PRESETS }} [layout]
 */
export function createButtonRow(specs, layout = {}) {
  const preset = layout.preset ? PRESETS[layout.preset] ?? {} : {};
  const sideX = preset.sideX ?? UI_SIDE_X;
  const sideY = preset.sideY ?? UI_SIDE_Y;
  const thirdY = preset.thirdY ?? UI_THIRD_Y;
  const ringZ = preset.ringZ ?? UI_RING_Z;
  const width = preset.width ?? 1.02;
  const height = preset.height ?? 0.34;

  const n = specs.length;
  const positions = [];

  if (n === 2) {
    positions.push(
      new THREE.Vector3(-sideX, sideY, ringZ),
      new THREE.Vector3(sideX, sideY, ringZ)
    );
  } else if (n === 3) {
    positions.push(
      new THREE.Vector3(-sideX, sideY, ringZ),
      new THREE.Vector3(sideX, sideY, ringZ),
      new THREE.Vector3(0, thirdY, ringZ)
    );
  } else {
    const span = 0.62;
    const startX = (-(n - 1) * span) / 2;
    for (let i = 0; i < n; i++) {
      positions.push(new THREE.Vector3(startX + i * span, sideY, ringZ));
    }
  }

  return specs.map((s, i) =>
    createGazeButton(s.label, positions[i], s.onSelect, {
      width,
      height,
      ...s.options,
    })
  );
}