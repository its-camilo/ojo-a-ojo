import * as THREE from 'three';
import { LAYER_BOTH } from './StereoRenderer.js';
import { applyHighQualityTexture } from './renderQuality.js';

const CANVAS_W = 1024;
const CANVAS_H = 320;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLabelTexture(label, renderer = null) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  const pad = 20;
  const rx = 14;
  ctx.fillStyle = '#1b2d47';
  roundRect(ctx, pad / 2, pad / 2, CANVAS_W - pad, CANVAS_H - pad, rx);
  ctx.fill();

  ctx.strokeStyle = '#68b5eb';
  ctx.lineWidth = 5;
  roundRect(ctx, pad / 2, pad / 2, CANVAS_W - pad, CANVAS_H - pad, rx);
  ctx.stroke();

  const lines = String(label)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const primary = lines[0] ?? label;
  const secondary = lines.slice(1).join(' ');

  const maxW = CANVAS_W - pad * 4;
  let titleSize = primary.length > 22 ? 52 : primary.length > 16 ? 58 : 64;
  let subSize = secondary ? 38 : 0;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${titleSize}px "DM Sans", system-ui, sans-serif`;
  while (titleSize > 34 && ctx.measureText(primary).width > maxW) {
    titleSize -= 2;
    ctx.font = `700 ${titleSize}px "DM Sans", system-ui, sans-serif`;
  }

  if (secondary) {
    ctx.font = `500 ${subSize}px "DM Sans", system-ui, sans-serif`;
    while (subSize > 26 && ctx.measureText(secondary).width > maxW) {
      subSize -= 2;
      ctx.font = `500 ${subSize}px "DM Sans", system-ui, sans-serif`;
    }
  }

  const lineGap = 10;
  const blockH = titleSize + (secondary ? subSize + lineGap : 0);
  const cy = CANVAS_H / 2;
  const titleY = secondary ? cy - blockH / 2 + titleSize / 2 : cy;

  ctx.font = `700 ${titleSize}px "DM Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(primary, CANVAS_W / 2, titleY);

  if (secondary) {
    ctx.font = `500 ${subSize}px "DM Sans", system-ui, sans-serif`;
    ctx.fillStyle = '#c8dcf5';
    ctx.fillText(secondary, CANVAS_W / 2, titleY + titleSize / 2 + lineGap + subSize / 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = true;
  applyHighQualityTexture(tex, renderer);
  return tex;
}

export function createGazeButton(label, position, onSelect, options = {}) {
  const width = options.width ?? 1.02;
  const height = options.height ?? 0.34;
  const tex = drawLabelTexture(label, options.renderer ?? null);

  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  mesh.rotation.set(0, 0, 0);
  mesh.renderOrder = 120;
  mesh.userData.gazeButton = true;
  mesh.userData.label = label;
  mesh.userData.onSelect = onSelect;
  mesh.layers.enable(LAYER_BOTH);
  return mesh;
}