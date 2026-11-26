import * as THREE from 'three';

/** Máscara facial cóncava (interior hacia el observador) — relieve tipo galería. */
export function buildHollowFaceGeometry() {
  const geo = new THREE.SphereGeometry(0.78, 192, 192, 0, Math.PI * 2, 0.11 * Math.PI, 0.8 * Math.PI);
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

    if (eyeL < 0.19) depth += 0.16 * (1 - eyeL / 0.19);
    if (eyeR < 0.19) depth += 0.16 * (1 - eyeR / 0.19);

    const browArc = Math.exp(-((u * u) / 0.28 + ((v - 0.34) ** 2) / 0.018)) * 0.09;
    depth += browArc;
    const browL = Math.exp(-(((u + 0.22) ** 2) / 0.04 + ((v - 0.28) ** 2) / 0.025)) * 0.05;
    const browR = Math.exp(-(((u - 0.22) ** 2) / 0.04 + ((v - 0.28) ** 2) / 0.025)) * 0.05;
    depth += browL + browR;

    const noseBridge = Math.exp(-((u * u) / 0.012 + ((v + 0.05) ** 2) / 0.08)) * -0.04;
    const noseTip = Math.hypot(u * 0.85, v + 0.12);
    if (noseTip < 0.13) depth -= 0.14 * (1 - noseTip / 0.13);
    depth += noseBridge;

    const cheekL = Math.hypot(u + 0.44, v + 0.06);
    const cheekR = Math.hypot(u - 0.44, v + 0.06);
    if (cheekL < 0.24) depth += 0.06 * (1 - cheekL / 0.24);
    if (cheekR < 0.24) depth += 0.06 * (1 - cheekR / 0.24);

    const lipY = -0.3;
    const lips = Math.exp(-((u * u) / 0.09 + ((v - lipY) ** 2) / 0.014)) * 0.1;
    depth += lips;

    const philtrum = Math.exp(-((u * u) / 0.004 + ((v + 0.08) ** 2) / 0.02)) * -0.03;
    depth += philtrum;

    const chin = Math.exp(-((u * u) / 0.07 + ((v + 0.52) ** 2) / 0.022)) * 0.08;
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