import * as THREE from 'three';

export function makeCheckerTexture(light = '#e8e4dc', dark = '#4a4540', tiles = 10) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const step = size / tiles;
  for (let row = 0; row < tiles; row++) {
    for (let col = 0; col < tiles; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? light : dark;
      ctx.fillRect(col * step, row * step, step, step);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeWallTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9bdb0';
  ctx.fillRect(0, 0, size, size);
  const winW = size * 0.22;
  const winH = size * 0.35;
  const gap = size * 0.08;
  let x = gap;
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = '#87b6d9';
    trapezoidWindow(ctx, x, size * 0.28, winW, winH, 0.12);
    x += winW + gap;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function trapezoidWindow(ctx, x, y, w, h, skew) {
  ctx.beginPath();
  ctx.moveTo(x + w * skew, y);
  ctx.lineTo(x + w * (1 - skew), y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 6;
  ctx.stroke();
}