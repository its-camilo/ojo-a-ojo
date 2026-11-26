import * as THREE from 'three';

/** Máscara facial cóncava (interior del rostro hacia el observador). */
export function buildHollowFaceGeometry() {
  const geo = new THREE.SphereGeometry(0.72, 80, 64, 0, Math.PI * 2, 0.15 * Math.PI, 0.72 * Math.PI);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    x *= 0.82;
    y *= 1.08;
    z *= 0.68;

  const u = x / 0.72;
    const v = y / 0.72;

    const eyeL = Math.hypot(u + 0.34, v - 0.18);
    const eyeR = Math.hypot(u - 0.34, v - 0.18);
    let depth = z;

    if (eyeL < 0.2) depth += 0.14 * (1 - eyeL / 0.2);
    if (eyeR < 0.2) depth += 0.14 * (1 - eyeR / 0.2);

    const brow = Math.exp(-((u * u) / 0.35 + ((v - 0.32) ** 2) / 0.02)) * 0.06;
    depth += brow;

    const nose = Math.hypot(u * 0.9, v + 0.02);
    if (nose < 0.14) depth -= 0.11 * (1 - nose / 0.14);

    const cheekL = Math.hypot(u + 0.42, v + 0.08);
    const cheekR = Math.hypot(u - 0.42, v + 0.08);
    if (cheekL < 0.22) depth += 0.05 * (1 - cheekL / 0.22);
    if (cheekR < 0.22) depth += 0.05 * (1 - cheekR / 0.22);

    const mouthY = -0.28;
    const mouth = Math.exp(-((u * u) / 0.08 + ((v - mouthY) ** 2) / 0.012)) * 0.08;
    depth += mouth;

    const chin = Math.exp(-((u * u) / 0.06 + ((v + 0.48) ** 2) / 0.02)) * 0.07;
    depth += chin;

    pos.setXYZ(i, x, y, depth);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}