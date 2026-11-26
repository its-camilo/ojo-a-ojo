import * as THREE from 'three';
import {
  makeCheckerTexture,
  makeWainscotTexture,
  makeMarbleTexture,
  makeWoodTexture,
} from '../utils/proceduralTextures.js';

export { makeCheckerTexture, makeWoodTexture, makeMarbleTexture };

export function makeWallTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const wainscot = makeWainscotTexture();
  const marble = makeMarbleTexture();
  ctx.drawImage(wainscot.image, 0, 0, size, size * 0.55);
  ctx.globalAlpha = 0.45;
  ctx.drawImage(marble.image, 0, size * 0.12, size, size * 0.88);
  ctx.globalAlpha = 1;

  const winW = size * 0.2;
  const winH = size * 0.32;
  let x = size * 0.06;
  for (let k = 0; k < 3; k++) {
    drawTrapezoidWindow(ctx, x, size * 0.26, winW, winH, 0.14);
    x += winW + size * 0.06;
  }

  ctx.fillStyle = '#6b4f38';
  ctx.fillRect(size * 0.68, size * 0.22, size * 0.22, size * 0.28);
  ctx.strokeStyle = '#3d2a1e';
  ctx.lineWidth = 6;
  ctx.strokeRect(size * 0.68, size * 0.22, size * 0.22, size * 0.28);
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.arc(size * 0.79, size * 0.36, size * 0.07, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawTrapezoidWindow(ctx, x, y, w, h, skew) {
  ctx.save();
  ctx.fillStyle = 'rgba(180, 215, 245, 0.55)';
  ctx.beginPath();
  ctx.moveTo(x + w * skew + 10, y + 10);
  ctx.lineTo(x + w * (1 - skew) - 10, y + 10);
  ctx.lineTo(x + w - 10, y + h - 10);
  ctx.lineTo(x + 10, y + h - 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f0ebe4';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + w * 0.35, y + 14, w * 0.12, h - 28);
  ctx.restore();
}