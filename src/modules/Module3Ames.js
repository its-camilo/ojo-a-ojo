import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { disposeGroup } from './clearGroup.js';
import { makeCheckerTexture, makeWallTexture, makeMarbleTexture, makeWoodTexture } from './amesTextures.js';
import { enableSharedStereoLayers } from '../rendering/stereoLayers.js';
import { disposeObject3D } from '../rendering/sceneDispose.js';

function wallMat(color, map = null, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    map,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: opts.offsetFactor ?? 1,
    polygonOffsetUnits: opts.offsetUnits ?? 1,
    ...opts,
  });
}

function interiorMat(color, map = null, opts = {}) {
  return new THREE.MeshLambertMaterial({
    color,
    map,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: opts.offsetFactor ?? 1,
    polygonOffsetUnits: opts.offsetUnits ?? 1,
    ...opts,
  });
}

function buildStylizedFigure(colors) {
  const fig = new THREE.Group();
  const skin = interiorMat(colors.skin);
  const cloth = interiorMat(colors.cloth);
  const pants = interiorMat(colors.pants, null, { offsetFactor: 2 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 32), skin);
  head.position.set(0, 0.78, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.14), cloth);
  torso.position.set(0, 0.44, 0);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.14), pants);
  pelvis.position.set(0, 0.18, 0);

  const arm = (sx) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.46, 20), cloth);
    m.position.set(sx, 0.27, 0.02);
    return m;
  };

  const leg = (sx) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.044, 0.36, 20), pants);
    m.position.set(sx, -0.08, 0);
    return m;
  };

  fig.add(head, torso, pelvis, arm(-0.14), arm(0.14), leg(-0.09), leg(0.09));
  return fig;
}

function addWindowFrame(group, w, h, depth, mat) {
  const t = 0.035;
  const bars = [
    [w + t * 2, t, 0, h / 2 - t / 2],
    [w + t * 2, t, 0, -h / 2 + t / 2],
    [t, h, -w / 2 - t / 2, 0],
    [t, h, w / 2 + t / 2, 0],
  ];
  for (const [bw, bh, x, y] of bars) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth), mat);
    bar.position.set(x, y, 0);
    group.add(bar);
  }
}

export class Module3Ames {
  constructor(stereo, monoRound, onComplete) {
    this.stereo = stereo;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.room = null;
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

  _buildRoom() {
    const room = new THREE.Group();
    room.scale.setScalar(0.9);
    room.position.set(0, -0.08, 0.25);

    const nearW = 3.9;
    const farW = 1.5;
    const depth = 4.9;
    const ceilingY = 2.55;
    const backZ = -depth - 0.58;

    const checker = makeCheckerTexture('#cbb89e', '#5a4d42', 12);
    checker.repeat.set(5, 7);
    const woodTex = makeWoodTexture();
    woodTex.repeat.set(2, 2);
    const wallTex = makeWallTexture();
    const marbleTex = makeMarbleTexture();
    marbleTex.repeat.set(2, 1);

    const floor = new THREE.Mesh(
      this._trapezoidSlabGeometry(nearW, farW, depth, -0.62),
      wallMat(0xd8cbb8, checker, { offsetUnits: 2 })
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

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(farW, ceilingY - 0.2),
      wallMat(0xdfd2c2, wallTex, { offsetFactor: 0, offsetUnits: 0 })
    );
    back.position.set(0, ceilingY / 2 - 0.08, backZ);
    room.add(back);

    const wainscotH = 1.0;
    const leftLo = new THREE.Mesh(new THREE.PlaneGeometry(depth + 0.4, wainscotH), wallMat(0xc8beb0, marbleTex));
    leftLo.rotation.y = -Math.PI / 2;
    leftLo.position.set(-nearW / 2 + 0.01, wainscotH / 2 - 0.12, -depth / 2 + 0.15);
    const leftHi = new THREE.Mesh(
      new THREE.PlaneGeometry(depth + 0.4, ceilingY - wainscotH - 0.15),
      wallMat(0xe5dcd0)
    );
    leftHi.rotation.y = -Math.PI / 2;
    leftHi.position.set(-nearW / 2 + 0.01, wainscotH + (ceilingY - wainscotH) / 2 - 0.28, -depth / 2 + 0.15);

    const rightLo = new THREE.Mesh(new THREE.PlaneGeometry(depth + 0.4, wainscotH), wallMat(0xc8beb0, marbleTex));
    rightLo.rotation.y = Math.PI / 2;
    rightLo.position.set(nearW / 2 - 0.01, wainscotH / 2 - 0.12, -depth / 2 + 0.15);
    const rightHi = new THREE.Mesh(
      new THREE.PlaneGeometry(depth + 0.4, ceilingY - wainscotH - 0.15),
      wallMat(0xe5dcd0)
    );
    rightHi.rotation.y = Math.PI / 2;
    rightHi.position.set(nearW / 2 - 0.01, wainscotH + (ceilingY - wainscotH) / 2 - 0.28, -depth / 2 + 0.15);
    room.add(leftLo, leftHi, rightLo, rightHi);

    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(nearW, 0.07, 0.05), interiorMat(0x6b5240));
    baseboard.position.set(0, -0.58, 0.08);
    room.add(baseboard);

    const windowGroup = new THREE.Group();
    windowGroup.position.set(0, 1.22, backZ + 0.16);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.32),
      interiorMat(0x9ec8ea, null, { emissive: 0x78a8d8, emissiveIntensity: 0.35 })
    );
    glass.position.z = 0.02;
    glass.renderOrder = 2;
    const frameMat = interiorMat(0xede4d8);
    addWindowFrame(windowGroup, 0.44, 0.32, 0.04, frameMat);
    windowGroup.add(glass);

    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), interiorMat(0xc9a227));
    clock.position.set(-farW / 2 + 0.28, 1.48, backZ + 0.12);
    clock.renderOrder = 3;
    room.add(windowGroup, clock);

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
    figNear.position.set(-0.72, -0.56, -1.15);
    figNear.rotation.y = 0.45;

    const figFar = buildStylizedFigure({ skin: 0xd4a888, cloth: 0x3b6ea8, pants: 0x3d342a });
    figFar.position.set(0.62, -0.56, -3.6);
    figFar.scale.setScalar(1.72);
    figFar.rotation.y = -0.3;

    room.add(figNear, figFar);
    enableSharedStereoLayers(room);
    this.room = room;
    this.group.add(room);

    this.ui = new THREE.Group();
    this._buildPromptButtons();
    enableSharedStereoLayers(this.ui);
    this.group.add(this.ui);

    this.stereo.setMono(this.phase === 'mono');
  }

  _buildPromptButtons() {
    disposeGroup(this.ui);
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
    this.stereo.scene.background = new THREE.Color(0x2a2218);
    this.stereo.scene.environment = null;
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    disposeObject3D(this.group);
    this.group = new THREE.Group();
    this.room = null;
    this.ui = null;
  }

  getInteractables() {
    return this.ui?.children ?? [];
  }

  onGazeSelect(mesh) {
    mesh.userData.onSelect?.();
  }

  completeForE2e() {
    this._answer('right');
    this._finish('equal');
  }
}