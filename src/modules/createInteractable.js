import * as THREE from 'three';

const CANVAS_W = 640;
const CANVAS_H = 160;

function drawLabelTexture(label) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  const pad = 20;
  ctx.fillStyle = '#0f1b2e';
  roundRect(ctx, pad / 2, pad / 2, CANVAS_W - pad, CANVAS_H - pad, 14);
  ctx.fill();

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  roundRect(ctx, pad / 2, pad / 2, CANVAS_W - pad, CANVAS_H - pad, 14);
  ctx.stroke();

  let fontSize = label.length > 18 ? 30 : label.length > 12 ? 34 : 40;
  ctx.fillStyle = '#f1f5f9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;

  while (fontSize > 22 && ctx.measureText(label).width > CANVAS_W - pad * 4) {
    fontSize -= 2;
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  }
  ctx.fillText(label, CANVAS_W / 2, CANVAS_H / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createGazeButton(label, position, onSelect, options = {}) {
  const width = options.width ?? 0.56;
  const height = options.height ?? 0.15;
  const tex = drawLabelTexture(label);

  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.rotation.y = Math.PI;
  mesh.renderOrder = 10;
  mesh.userData.gazeButton = true;
  mesh.userData.label = label;
  mesh.userData.onSelect = onSelect;
  return mesh;
}