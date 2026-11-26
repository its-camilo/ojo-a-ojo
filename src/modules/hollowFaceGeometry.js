import * as THREE from 'three';

/** Máscara facial esculpida de alta resolución (interior cóncavo hacia el observador). */
export function buildHollowFaceGeometry() {
  const geo = new THREE.SphereGeometry(0.78, 96, 80, 0, Math.PI * 2, 0.12 * Math.PI, 0.78 * Math.PI);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    x *= 0.84;
    y *= 1.12;
    z *= 0.62;

    const u = x / 0.78;
    const v = y / 0.78;

    const eyeL = Math.hypot(u + 0.36, v - 0.2);
    const eyeR = Math.hypot(u - 0.36, v - 0.2);
    let depth = z;

    if (eyeL < 0.2) depth += 0.2 * (1 - eyeL / 0.2) ** 1.2;
    if (eyeR < 0.2) depth += 0.2 * (1 - eyeR / 0.2) ** 1.2;

    const browArc = Math.exp(-((u * u) / 0.26 + ((v - 0.36) ** 2) / 0.016)) * 0.12;
    depth += browArc;
    const browL = Math.exp(-(((u + 0.22) ** 2) / 0.035 + ((v - 0.3) ** 2) / 0.022)) * 0.07;
    const browR = Math.exp(-(((u - 0.22) ** 2) / 0.035 + ((v - 0.3) ** 2) / 0.022)) * 0.07;
    depth += browL + browR;

    const noseBridge = Math.exp(-((u * u) / 0.01 + ((v + 0.02) ** 2) / 0.07)) * -0.05;
    const noseTip = Math.hypot(u * 0.82, v + 0.14);
    if (noseTip < 0.14) depth -= 0.17 * (1 - noseTip / 0.14);
    const noseWingL = Math.hypot(u + 0.1, v + 0.02);
    const noseWingR = Math.hypot(u - 0.1, v + 0.02);
    if (noseWingL < 0.08) depth -= 0.04 * (1 - noseWingL / 0.08);
    if (noseWingR < 0.08) depth -= 0.04 * (1 - noseWingR / 0.08);
    depth += noseBridge;

    const cheekL = Math.hypot(u + 0.44, v + 0.06);
    const cheekR = Math.hypot(u - 0.44, v + 0.06);
    if (cheekL < 0.24) depth += 0.06 * (1 - cheekL / 0.24);
    if (cheekR < 0.24) depth += 0.06 * (1 - cheekR / 0.24);

    const lipY = -0.32;
    const upperLip = Math.exp(-((u * u) / 0.08 + ((v - lipY - 0.02) ** 2) / 0.012)) * 0.11;
    const lowerLip = Math.exp(-((u * u) / 0.085 + ((v - lipY + 0.05) ** 2) / 0.016)) * 0.12;
    depth += upperLip + lowerLip;

    const philtrum = Math.exp(-((u * u) / 0.003 + ((v + 0.06) ** 2) / 0.018)) * -0.04;
    depth += philtrum;

    const chin = Math.exp(-((u * u) / 0.065 + ((v + 0.54) ** 2) / 0.02)) * 0.1;
    depth += chin;

    const templeL = Math.exp(-(((u + 0.55) ** 2) / 0.05 + ((v - 0.1) ** 2) / 0.12)) * 0.03;
    const templeR = Math.exp(-(((u - 0.55) ** 2) / 0.05 + ((v - 0.1) ** 2) / 0.12)) * 0.03;
    depth += templeL + templeR;

    pos.setXYZ(i, x, y, depth);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}