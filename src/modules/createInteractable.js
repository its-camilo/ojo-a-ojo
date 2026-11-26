import * as THREE from 'three';

export function createGazeButton(label, position, onSelect, options = {}) {
  const width = options.width ?? 1.2;
  const height = options.height ?? 0.35;
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    color: options.color ?? 0x1e3a5f,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.userData.gazeButton = true;
  mesh.userData.label = label;
  mesh.userData.onSelect = onSelect;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 42px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.95, height * 0.7), labelMat);
  labelMesh.position.z = 0.01;
  mesh.add(labelMesh);

  return mesh;
}