import * as THREE from 'three';
import { createGazeButton } from '../rendering/gazeButton.js';

/** Botones periféricos cerca del centro de mirada (no en la franja inferior). */
export const UI_RING_Z = -2.08;
export const UI_SIDE_X = 0.78;
export const UI_SIDE_Y = -0.2;
export const UI_THIRD_Y = -0.46;

/**
 * Coloca botones en arco alrededor del estímulo: laterales a media altura y tercera opción debajo del centro.
 */
export function createButtonRow(specs) {
  const n = specs.length;
  const positions = [];

  if (n === 2) {
    positions.push(
      new THREE.Vector3(-UI_SIDE_X, UI_SIDE_Y, UI_RING_Z),
      new THREE.Vector3(UI_SIDE_X, UI_SIDE_Y, UI_RING_Z)
    );
  } else if (n === 3) {
    positions.push(
      new THREE.Vector3(-UI_SIDE_X, UI_SIDE_Y, UI_RING_Z),
      new THREE.Vector3(UI_SIDE_X, UI_SIDE_Y, UI_RING_Z),
      new THREE.Vector3(0, UI_THIRD_Y, UI_RING_Z)
    );
  } else {
    const span = 0.62;
    const startX = (-(n - 1) * span) / 2;
    for (let i = 0; i < n; i++) {
      positions.push(new THREE.Vector3(startX + i * span, UI_SIDE_Y, UI_RING_Z));
    }
  }

  return specs.map((s, i) =>
    createGazeButton(s.label, positions[i], s.onSelect, {
      width: 1.02,
      height: 0.34,
      ...s.options,
    })
  );
}