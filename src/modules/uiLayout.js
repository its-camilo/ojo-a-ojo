import * as THREE from 'three';
import { createGazeButton } from '../rendering/gazeButton.js';

export const UI_RING_Z = -2.08;

/** cos(30°) y sin(30°) para θ = 210° y 330° alrededor del origen en el plano XY. */
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

const PRESETS = {
  /** Dos botones a 180°: (-R, 0) y (+R, 0). */
  hollow: { R: 0.92, ringZ: UI_RING_Z, width: 0.94, height: 0.3 },
  /** Triplete circular 120° (estímulo central). */
  balance: { R: 0.74, ringZ: UI_RING_Z, width: 0.94, height: 0.3 },
  rds: { R: 0.72, ringZ: UI_RING_Z, width: 0.94, height: 0.3 },
  /** Radio algo menor + botones compactos para no tapar figuras. */
  ames: { R: 0.66, ringZ: -2.05, width: 0.82, height: 0.27 },
};

/**
 * Posiciones polares: índice 0 → 210°, 1 → 330°, 2 → 90° (neutral arriba).
 */
function circularTripletPositions(R, ringZ) {
  return [
    new THREE.Vector3(-R * COS30, -R * SIN30, ringZ),
    new THREE.Vector3(R * COS30, -R * SIN30, ringZ),
    new THREE.Vector3(0, R, ringZ),
  ];
}

/** Dos botones diametrales en y = 0. */
function circularPairPositions(R, ringZ) {
  return [new THREE.Vector3(-R, 0, ringZ), new THREE.Vector3(R, 0, ringZ)];
}

/**
 * Distribuye botones en anillo circular alrededor de (0, 0) en el plano de mirada.
 * @param {Array<{ label: string, onSelect: () => void, options?: object }>} specs
 * @param {{ preset?: keyof typeof PRESETS, R?: number, ringZ?: number, width?: number, height?: number }} [layout]
 */
export function createButtonRow(specs, layout = {}) {
  const preset = layout.preset ? PRESETS[layout.preset] ?? {} : {};
  const R = layout.R ?? preset.R ?? 0.74;
  const ringZ = layout.ringZ ?? preset.ringZ ?? UI_RING_Z;
  const width = layout.width ?? preset.width ?? 0.94;
  const height = layout.height ?? preset.height ?? 0.3;

  const n = specs.length;
  let positions;

  if (n === 2) {
    positions = circularPairPositions(R, ringZ);
  } else if (n === 3) {
    positions = circularTripletPositions(R, ringZ);
  } else {
    positions = [];
    const step = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const theta = Math.PI / 2 + i * step;
      positions.push(new THREE.Vector3(R * Math.cos(theta), R * Math.sin(theta), ringZ));
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