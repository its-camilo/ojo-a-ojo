import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { makeCheckerTexture, makeWallTexture, makeWoodTexture } from './amesTextures.js';
import { enableSharedStereoLayers } from '../utils/stereoLayers.js';

function wallMat(color, map = null) {
  return new THREE.MeshBasicMaterial({
    color,
    map,
    side: THREE.DoubleSide,
  });
}

function interiorMat(color, map = null) {
  return new THREE.MeshLambertMaterial({ color, map, side: THREE.DoubleSide });
}

function buildStylizedFigure(colors) {
  const fig = new THREE.Group();
  const skin = interiorMat(colors.skin);
  const cloth = interiorMat(colors.cloth);
  const pants = interiorMat(colors.pants);
  const shoe = interiorMat(0x2a2420);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 28, 22), skin);
  head.scale.set(1, 1.1, 0.92);
  head.position.set(0, 0.84, 0.01);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 14), skin);
  neck.position.set(0, 0.72, 0);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), cloth);
  shoulders.scale.set(1.65, 0.42, 0.55);
  shoulders.position.set(0, 0.62, 0);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.095, 0.34, 18), cloth);
  torso.position.set(0, 0.4, 0);

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.1, 16), pants);
  pelvis.position.set(0, 0.18, 0);

  const makeLimb = (sx, topY, len, mat, radius = 0.038) => {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.95, len * 0.52, 12), mat);
    upper.position.set(sx, topY - len * 0.26, 0.02);
    upper.rotation.z = sx > 0 ? -0.08 : 0.08;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 0.85, len * 0.48, 12), mat);
    lower.position.set(sx * 1.02, topY - len * 0.74, 0.01);
    return [upper, lower];
  };

  const makeLeg = (sx) => {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.22, 12), pants);
    thigh.position.set(sx, 0.02, 0);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.038, 0.22, 12), pants);
    calf.position.set(sx, -0.24, 0);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), shoe);
    foot.scale.set(1.3, 0.55, 1.6);
    foot.position.set(sx, -0.38, 0.04);
    return [thigh, calf, foot];
  };

  fig.add(
    head,
    neck,
    shoulders,
    torso,
    pelvis,
    ...makeLimb(-0.2, 0.58, 0.5, cloth, 0.036),
    ...makeLimb(0.2, 0.58, 0.5, cloth, 0.036),
    ...makeLeg(-0.08),
    ...makeLeg(0.08)
  );
  return fig;
}

export class Module3Ames {
  constructor(stereo, monoRound, onComplete) {
    this.stereo = stereo;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.phase = 'mono';
    this.answer = null;
    this._buildRoom();
  }

  _trapezoidSlabGeometry(nearW, farW, depth, y = 0, extraNear = 0.55) {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -nearW / 2, y, extraNear,
      nearW / 2, y, extraNear,
      farW / 2, y, -depth,
      -farW / 2, y, -depth,
    ]);
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    return geo;
  }

  /** Pared lateral que sigue el trapecio del piso (evita huecos negros hacia el fondo). */
  _trapezoidWallGeometry(isLeft, nearW, farW, depth, y0, y1, extraNear = 0.55) {
    const nearX = isLeft ? -nearW / 2 : nearW / 2;
    const farX = isLeft ? -farW / 2 : farW / 2;
    const nearZ = extraNear;
    const farZ = -depth;
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      nearX, y0, nearZ,
      nearX, y1, nearZ,
      farX, y1, farZ,
      farX, y0, farZ,
    ]);
    const uvs = new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(isLeft ? [0, 1, 2, 0, 2, 3] : [0, 3, 2, 0, 2, 1]);
    geo.computeVertexNormals();
    return geo;
  }

  /** Tapeta lateral hacia la cámara para cerrar huecos fuera del trapecio. */
  _forwardCeilingPanelGeometry(nearW, ceilingY, extraNear = 0.2) {
    const nearZ = extraNear;
    const farZ = 1.85;
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -nearW / 2, ceilingY, nearZ,
      nearW / 2, ceilingY, nearZ,
      nearW * 0.9, ceilingY, farZ,
      -nearW * 0.9, ceilingY, farZ,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    return geo;
  }

  _forwardSidePanelGeometry(isLeft, nearW, ceilingY, floorY, extraNear = 0.2) {
    const nearX = isLeft ? -nearW / 2 : nearW / 2;
    const farOutX = isLeft ? -2.6 : 2.6;
    const nearZ = extraNear;
    const farZ = 1.85;
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      nearX, floorY, nearZ,
      nearX, ceilingY, nearZ,
      farOutX, ceilingY, farZ,
      farOutX, floorY, farZ,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setIndex(isLeft ? [0, 1, 2, 0, 2, 3] : [0, 3, 2, 0, 2, 1]);
    geo.computeVertexNormals();
    return geo;
  }

  _cornerWedgeGeometry(isLeft, nearW, farW, depth, y, extraNear = 0.55) {
    const nearX = isLeft ? -nearW / 2 : nearW / 2;
    const farX = isLeft ? -farW / 2 : farW / 2;
    const nearZ = extraNear;
    const farZ = -depth;
    const backX = isLeft ? -farW / 2 : farW / 2;
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      nearX, y, nearZ,
      farX, y, farZ,
      backX, y, farZ,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setIndex([0, 1, 2]);
    geo.computeVertexNormals();
    return geo;
  }

  _buildRoom() {
    const room = new THREE.Group();
    room.scale.setScalar(0.86);
    room.position.set(0, -0.05, -0.08);

    const nearW = 3.9;
    const farW = 1.5;
    const depth = 4.9;
    const ceilingY = 2.55;
    const wainscotH = 1.0;
    const floorY = -0.62;
    const extraNear = 0.2;
    const wallZ = -0.32;

    const checker = makeCheckerTexture('#cbb89e', '#5a4d42', 12);
    checker.repeat.set(5, 7);
    const woodTex = makeWoodTexture();
    woodTex.repeat.set(2, 2);
    const wallTex = makeWallTexture();
    const floor = new THREE.Mesh(
      this._trapezoidSlabGeometry(nearW, farW, depth, -0.62),
      wallMat(0xd8cbb8, checker)
    );
    floor.position.z = -0.32;
    room.add(floor);

    const ceiling = new THREE.Mesh(
      this._trapezoidSlabGeometry(nearW, farW, depth, 0),
      wallMat(0xd4c4b0, woodTex)
    );
    ceiling.rotation.x = Math.PI;
    ceiling.position.set(0, ceilingY, -0.32);
    room.add(ceiling);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(farW + 0.02, ceilingY - 0.12), wallMat(0xdfd2c2, wallTex));
    back.position.set(0, ceilingY / 2 - 0.06, -depth - 0.32);
    room.add(back);

    const crown = new THREE.Mesh(
      this._trapezoidSlabGeometry(nearW, farW, depth, ceilingY - 0.06, extraNear),
      wallMat(0xc4b4a0)
    );
    crown.position.z = wallZ;
    room.add(crown);

    const wainscotRailL = new THREE.Mesh(
      this._trapezoidSlabGeometry(nearW, farW, depth, wainscotH - 0.14, extraNear),
      wallMat(0xb8a898)
    );
    wainscotRailL.position.z = wallZ;
    room.add(wainscotRailL);

    const leftLo = new THREE.Mesh(
      this._trapezoidWallGeometry(true, nearW, farW, depth, floorY, wainscotH - 0.12, extraNear),
      wallMat(0xc8beb0)
    );
    const leftHi = new THREE.Mesh(
      this._trapezoidWallGeometry(true, nearW, farW, depth, wainscotH - 0.12, ceilingY - 0.05, extraNear),
      wallMat(0xe5dcd0)
    );
    const rightLo = new THREE.Mesh(
      this._trapezoidWallGeometry(false, nearW, farW, depth, floorY, wainscotH - 0.12, extraNear),
      wallMat(0xc8beb0)
    );
    const rightHi = new THREE.Mesh(
      this._trapezoidWallGeometry(false, nearW, farW, depth, wainscotH - 0.12, ceilingY - 0.05, extraNear),
      wallMat(0xe5dcd0)
    );
    [leftLo, leftHi, rightLo, rightHi].forEach((m) => {
      m.position.z = wallZ;
    });

    const ceilWedgeMat = wallMat(0xd4c4b0, woodTex);
    const leftCeilWedge = new THREE.Mesh(
      this._cornerWedgeGeometry(true, nearW, farW, depth, ceilingY, extraNear),
      ceilWedgeMat
    );
    const rightCeilWedge = new THREE.Mesh(
      this._cornerWedgeGeometry(false, nearW, farW, depth, ceilingY, extraNear),
      ceilWedgeMat
    );
    [leftCeilWedge, rightCeilWedge].forEach((m) => {
      m.position.z = wallZ;
    });

    const forwardFillL = new THREE.Mesh(
      this._forwardSidePanelGeometry(true, nearW, ceilingY, floorY, extraNear),
      wallMat(0xe8ddd0)
    );
    const forwardFillR = new THREE.Mesh(
      this._forwardSidePanelGeometry(false, nearW, ceilingY, floorY, extraNear),
      wallMat(0xe8ddd0)
    );
    [forwardFillL, forwardFillR].forEach((m) => {
      m.position.z = wallZ;
    });

    const forwardCeil = new THREE.Mesh(
      this._forwardCeilingPanelGeometry(nearW, ceilingY, extraNear),
      wallMat(0xd4c4b0, woodTex)
    );
    forwardCeil.position.z = wallZ;
    room.add(
      leftLo,
      leftHi,
      rightLo,
      rightHi,
      leftCeilWedge,
      rightCeilWedge,
      forwardFillL,
      forwardFillR,
      forwardCeil
    );

    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(nearW, 0.07, 0.05),
      interiorMat(0x6b5240)
    );
    baseboard.position.set(0, -0.58, 0.08);
    room.add(baseboard);

    const windowGroup = new THREE.Group();
    windowGroup.position.set(0, 1.28, -depth - 0.31);
    const winGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.38),
      interiorMat(0xd8e4f0)
    );
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.04), interiorMat(0xf2ebe2));
    const winMullionV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.05), interiorMat(0xede4d8));
    const winMullionH = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.05), interiorMat(0xede4d8));
    windowGroup.add(winGlow, winFrame, winMullionV, winMullionH);

    const clockGroup = new THREE.Group();
    clockGroup.position.set(-farW / 2 + 0.28, 1.52, -depth - 0.33);
    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), interiorMat(0xf0e8d8));
    const clockRim = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.12, 32), interiorMat(0xc9a227));
    const clockHand = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.07, 0.01), interiorMat(0x3a342a));
    clockHand.position.y = 0.02;
    clockGroup.add(clockFace, clockRim, clockHand);
    room.add(windowGroup, clockGroup);

    const ceilingLight = new THREE.PointLight(0xfff0d8, 2.2, 16);
    ceilingLight.position.set(0, 2.05, -2);
    const fill = new THREE.DirectionalLight(0xfff5e8, 0.95);
    fill.position.set(-1.5, 2.5, 1.5);
    const rim = new THREE.DirectionalLight(0xe8d8c8, 0.55);
    rim.position.set(2, 1, -1);
    room.add(
      ceilingLight,
      fill,
      rim,
      new THREE.AmbientLight(0xe8dcc8, 0.72),
      new THREE.HemisphereLight(0xfff8f0, 0x6a5c48, 0.45)
    );

    const figNear = buildStylizedFigure({ skin: 0xe8b898, cloth: 0xd45d48, pants: 0x2c3e50 });
    figNear.position.set(-0.48, -0.58, -1.62);
    figNear.rotation.y = 0.35;

    const figFar = buildStylizedFigure({ skin: 0xd4a888, cloth: 0x3b6ea8, pants: 0x3d342a });
    figFar.position.set(0.55, -0.58, -3.58);
    figFar.scale.setScalar(1.72);
    figFar.rotation.y = -0.3;

    room.add(figNear, figFar);
    enableSharedStereoLayers(room);
    this.group.add(room);

    this.ui = new THREE.Group();
    this._buildPromptButtons();
    enableSharedStereoLayers(this.ui);
    this.group.add(this.ui);

    this.stereo.setMono(this.phase === 'mono');
  }

  _buildPromptButtons() {
    clearGroup(this.ui);
    const tag = this.phase === 'mono' ? 'Mono' : 'Estéreo';
    createButtonRow([
      { label: `${tag}: Izquierda`, onSelect: () => this._answer('left') },
      { label: `${tag}: Derecha`, onSelect: () => this._answer('right') },
      { label: `${tag}: Igual`, onSelect: () => this._answer('equal') },
    ]).forEach((b) => this.ui.add(b));
  }

  _answer(choice) {
    if (this.phase === 'mono') {
      this.monoAnswer = choice;
      this.phase = 'stereo';
      this.stereo.setMono(false);
      this._buildPromptButtons();
    } else {
      this._finish(choice);
    }
  }

  _finish(stereoChoice) {
    const interpretation =
      'Cuarto trapezoidal (Ames): la perspectiva forzada altera la escala percibida (Ittelson, 1952; Gehringer y Engel, 1986). Compare si la estereopsis atenúa la ilusión entre rondas. Sin tracking de traslación (3DoF).';

    this.onComplete({
      moduleId: 'ames',
      title: 'Cuarto de Ames 3D',
      monoJudgment: this.monoAnswer ?? stereoChoice,
      stereoJudgment: stereoChoice,
      interpretation,
    });
  }

  mount() {
    this.stereo.scene.background = new THREE.Color(0xc9beb0);
    this.stereo.scene.environment = null;
    this.stereo.renderer.toneMappingExposure = 1.02;
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
  }

  getInteractables() {
    return this.ui.children;
  }

  onGazeSelect(mesh) {
    mesh.userData.onSelect?.();
  }

  completeForE2e() {
    this._answer('right');
    this._finish('equal');
  }
}