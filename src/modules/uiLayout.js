import * as THREE from 'three';
import { createGazeButton } from './createInteractable.js';

export const UI_ROW_Y = -0.95;
export const UI_ROW_Z = -2.45;

/**
 * Coloca botones de respuesta en fila debajo de la ilusión, mirando al observador.
 */
export function createButtonRow(specs) {
  const n = specs.length;
  const span = n === 2 ? 1.05 : n === 3 ? 0.95 : 1.1;
  const startX = (-(n - 1) * span) / 2;
  return specs.map((s, i) => {
    const pos = new THREE.Vector3(startX + i * span, UI_ROW_Y, UI_ROW_Z);
    return createGazeButton(s.label, pos, s.onSelect, s.options);
  });
}