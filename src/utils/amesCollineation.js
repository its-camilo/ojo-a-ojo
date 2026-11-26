import * as THREE from 'three';

/** Mirilla / observador E (m) y vector w para colineación (Sawada 2024; Ittelson 1952). */
export const AMES_EYE = new THREE.Vector3(0, 0, 0);
/** Signo negativo: esquina izquierda del fondo queda físicamente más cercana a E (figura más grande en pantalla). */
export const AMES_W = new THREE.Vector3(-0.22, 0, 0);

export const AMES_ROOM = {
  width: 4.6,
  height: 2.9,
  zNear: -1.8,
  zFar: -5.4,
  floorY: -1.55,
  get ceilY() {
    return this.floorY + this.height;
  },
  get halfW() {
    return this.width / 2;
  },
  wainscotH: 0.92,
};

const MIN_DENOM = 0.45;

/**
 * X' = E + (X - E) / (1 + dot(w, X - E))
 * @param {THREE.Vector3} X
 * @param {THREE.Vector3} [E]
 * @param {THREE.Vector3} [w]
 */
export function collineateForward(X, E = AMES_EYE, w = AMES_W) {
  const d = new THREE.Vector3().subVectors(X, E);
  const denom = Math.max(MIN_DENOM, 1 + w.x * d.x + w.y * d.y + w.z * d.z);
  return new THREE.Vector3(E.x + d.x / denom, E.y + d.y / denom, E.z + d.z / denom);
}

/** X = E + (X' - E) / (1 - dot(w, X' - E)) */
export function collineateInverse(Xp, E = AMES_EYE, w = AMES_W) {
  const d = new THREE.Vector3().subVectors(Xp, E);
  const denom = Math.max(MIN_DENOM, 1 - w.x * d.x - w.y * d.y - w.z * d.z);
  return new THREE.Vector3(E.x + d.x / denom, E.y + d.y / denom, E.z + d.z / denom);
}

/**
 * Transforma posiciones arquitectónicas a físicas y añade atributo `aArch`.
 * @param {THREE.BufferGeometry} geometry
 */
export function collineateGeometryFromArch(geometry, E = AMES_EYE, w = AMES_W) {
  const pos = geometry.attributes.position;
  const arch = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const out = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    arch[i * 3] = v.x;
    arch[i * 3 + 1] = v.y;
    arch[i * 3 + 2] = v.z;
    out.copy(collineateForward(v, E, w));
    pos.setXYZ(i, out.x, out.y, out.z);
  }
  geometry.setAttribute('aArch', new THREE.BufferAttribute(arch, 3));
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function meshFromArchPrimitive(primitive, archMatrix, material, E = AMES_EYE, w = AMES_W) {
  const geo = primitive.clone();
  geo.applyMatrix4(archMatrix);
  collineateGeometryFromArch(geo, E, w);
  return new THREE.Mesh(geo, material);
}

export function archMatrixFromBox(cx, cy, cz, sx, sy, sz) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(cx, cy, cz),
    new THREE.Quaternion(),
    new THREE.Vector3(sx, sy, sz)
  );
}