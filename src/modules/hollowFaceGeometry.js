import * as THREE from 'three';

/** Máscara facial cóncava (interior hacia el observador) — relieve tipo galería. */
export function buildHollowFaceGeometry() {
  const geo = new THREE.SphereGeometry(0.78, 112, 96, 0, Math.PI * 2, 0.11 * Math.PI, 0.8 * Math.PI);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    x *= 0.83;
    y *= 1.14;
    z *= 0.58;

    const u = x / 0.78;
    const v = y / 0.78;

    const eyeL = Math.hypot(u + 0.36, v - 0.18);
    const eyeR = Math.hypot(u - 0.36, v - 0.18);
    let depth = z;

    if (eyeL < 0.2) {
      depth += 0.22 * (1 - eyeL / 0.2) ** 1.1;
      if (v - 0.18 > 0.04) depth += 0.04 * Math.exp(-((eyeL - 0.12) ** 2) / 0.004);
    }
    if (eyeR < 0.2) {
      depth += 0.22 * (1 - eyeR / 0.2) ** 1.1;
      if (v - 0.18 > 0.04) depth += 0.04 * Math.exp(-((eyeR - 0.12) ** 2) / 0.004);
    }

    const lidL = Math.exp(-(((u + 0.36) ** 2) / 0.03 + ((v - 0.08) ** 2) / 0.018)) * 0.06;
    const lidR = Math.exp(-(((u - 0.36) ** 2) / 0.03 + ((v - 0.08) ** 2) / 0.018)) * 0.06;
    depth += lidL + lidR;

    const browArc = Math.exp(-((u * u) / 0.24 + ((v - 0.38) ** 2) / 0.014)) * 0.13;
    depth += browArc;

    const browL = Math.exp(-(((u + 0.24) ** 2) / 0.032 + ((v - 0.32) ** 2) / 0.02)) * 0.08;
    const browR = Math.exp(-(((u - 0.24) ** 2) / 0.032 + ((v - 0.32) ** 2) / 0.02)) * 0.08;
    depth += browL + browR;

    const noseBridge = Math.exp(-((u * u) / 0.008 + ((v + 0.04) ** 2) / 0.06)) * -0.06;
    const noseTip = Math.hypot(u * 0.8, v + 0.16);
    if (noseTip < 0.15) depth -= 0.19 * (1 - noseTip / 0.15);
    const noseWingL = Math.hypot(u + 0.11, v + 0.04);
    const noseWingR = Math.hypot(u - 0.11, v + 0.04);
    if (noseWingL < 0.09) depth -= 0.055 * (1 - noseWingL / 0.09);
    if (noseWingR < 0.09) depth -= 0.055 * (1 - noseWingR / 0.09);
    const nostrilL = Math.exp(-(((u + 0.07) ** 2) / 0.0015 + ((v + 0.1) ** 2) / 0.008)) * -0.03;
    const nostrilR = Math.exp(-(((u - 0.07) ** 2) / 0.0015 + ((v + 0.1) ** 2) / 0.008)) * -0.03;
    depth += noseBridge + nostrilL + nostrilR;

    const cheekL = Math.hypot(u + 0.45, v + 0.04);
    const cheekR = Math.hypot(u - 0.45, v + 0.04);
    if (cheekL < 0.26) depth += 0.075 * (1 - cheekL / 0.26);
    if (cheekR < 0.26) depth += 0.075 * (1 - cheekR / 0.26);

    const jawL = Math.exp(-(((u + 0.42) ** 2) / 0.05 + ((v + 0.35) ** 2) / 0.03)) * 0.05;
    const jawR = Math.exp(-(((u - 0.42) ** 2) / 0.05 + ((v + 0.35) ** 2) / 0.03)) * 0.05;
    depth += jawL + jawR;

    const lipY = -0.33;
    const upperLip = Math.exp(-((u * u) / 0.075 + ((v - lipY - 0.025) ** 2) / 0.01)) * 0.12;
    const lowerLip = Math.exp(-((u * u) / 0.08 + ((v - lipY + 0.055) ** 2) / 0.014)) * 0.13;
    const commissureL = Math.exp(-(((u + 0.2) ** 2) / 0.01 + ((v - lipY) ** 2) / 0.02)) * 0.05;
    const commissureR = Math.exp(-(((u - 0.2) ** 2) / 0.01 + ((v - lipY) ** 2) / 0.02)) * 0.05;
    depth += upperLip + lowerLip + commissureL + commissureR;

    const philtrum = Math.exp(-((u * u) / 0.0025 + ((v + 0.04) ** 2) / 0.016)) * -0.045;
    depth += philtrum;

    const chin = Math.exp(-((u * u) / 0.06 + ((v + 0.56) ** 2) / 0.018)) * 0.11;
    depth += chin;

    const templeL = Math.exp(-(((u + 0.56) ** 2) / 0.045 + ((v - 0.08) ** 2) / 0.1)) * 0.03;
    const templeR = Math.exp(-(((u - 0.56) ** 2) / 0.045 + ((v - 0.08) ** 2) / 0.1)) * 0.03;
    depth += templeL + templeR;

    pos.setXYZ(i, x, y, depth);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}