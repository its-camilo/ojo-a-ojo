import * as THREE from 'three';

function disposeMaterial(mat) {
  if (!mat) return;
  if (Array.isArray(mat)) {
    mat.forEach(disposeMaterial);
    return;
  }
  const maps = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'emissiveMap',
    'aoMap',
    'bumpMap',
    'displacementMap',
    'alphaMap',
    'envMap',
  ];
  maps.forEach((key) => {
    const tex = mat[key];
    if (tex?.dispose) tex.dispose();
  });
  mat.dispose();
}

/**
 * Removes an object from its parent and disposes geometries, materials, and textures.
 * @param {THREE.Object3D} object
 */
export function disposeObject3D(object) {
  if (!object) return;
  object.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    disposeMaterial(node.material);
  });
  if (object.parent) object.parent.remove(object);
}

/** Clears and disposes all children of a group. */
export function disposeGroup(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject3D(child);
  }
}