import * as THREE from 'three';

function canvasTexture(drawFn, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeWoodTexture() {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = '#3d2817';
    ctx.fillRect(0, 0, size, size);
    const bands = 28;
    for (let i = 0; i < bands; i++) {
      const y = (i / bands) * size;
      const wobble = Math.sin(i * 1.7) * 12;
      const grad = ctx.createLinearGradient(0, y, size, y + size / bands);
      grad.addColorStop(0, `hsl(28, 38%, ${22 + (i % 3) * 4}%)`);
      grad.addColorStop(0.5, `hsl(32, 42%, ${30 + (i % 2) * 5}%)`);
      grad.addColorStop(1, `hsl(26, 35%, ${18 + (i % 4) * 3}%)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + wobble, size * 0.7, y - wobble, size, y + 4);
      ctx.lineTo(size, y + size / bands + 6);
      ctx.bezierCurveTo(size * 0.6, y + size / bands + wobble, size * 0.2, y + size / bands - wobble, 0, y + size / bands);
      ctx.closePath();
      ctx.fill();
    }
    for (let k = 0; k < 400; k++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 2 + Math.random() * 3);
    }
  }, 512);
}

export function makeMarbleTexture() {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = '#e8ecef';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(120, 135, 150, ${0.08 + Math.random() * 0.12})`;
      ctx.lineWidth = 2 + Math.random() * 18;
      ctx.beginPath();
      let x = Math.random() * size;
      let y = Math.random() * size;
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (Math.random() - 0.5) * size * 0.4;
        y += (Math.random() - 0.3) * size * 0.25;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let k = 0; k < size * 0.8; k++) {
      ctx.fillStyle = `rgba(180, 190, 200, ${Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
  }, 512);
}

export function makePlasterTexture() {
  return canvasTexture((ctx, size) => {
    const base = 236 + Math.floor(Math.random() * 8);
    ctx.fillStyle = `rgb(${base}, ${base - 4}, ${base - 10})`;
    ctx.fillRect(0, 0, size, size);
    for (let k = 0; k < size * 2.5; k++) {
      const v = 200 + Math.random() * 50;
      ctx.fillStyle = `rgba(${v}, ${v - 2}, ${v - 8}, ${0.03 + Math.random() * 0.06})`;
      const r = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 512);
}

export function makeCheckerTexture(light = '#e2ddd4', dark = '#4a433c', tiles = 10) {
  return canvasTexture(
    (ctx, size) => {
      const step = size / tiles;
      for (let row = 0; row < tiles; row++) {
        for (let col = 0; col < tiles; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? light : dark;
          ctx.fillRect(col * step, row * step, step, step);
        }
      }
    },
    256
  );
}

export function makeWainscotTexture() {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = '#d4ccc2';
    ctx.fillRect(0, 0, size, size);
    const panelH = size / 5;
    for (let row = 0; row < 5; row++) {
      const y = row * panelH;
      ctx.strokeStyle = '#b8aea2';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, y + 8, size - 16, panelH - 16);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(12, y + 12, size - 24, panelH / 2 - 14);
    }
    ctx.fillStyle = '#9a8f84';
    ctx.fillRect(0, size - 28, size, 28);
  }, 512);
}

export function makeRoughnessFromCanvas(baseTex, contrast = 0.35) {
  const img = baseTex.image;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const lum = (data.data[i] + data.data[i + 1] + data.data[i + 2]) / (3 * 255);
    const r = Math.floor((contrast + lum * (1 - contrast)) * 255);
    data.data[i] = data.data[i + 1] = data.data[i + 2] = r;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}