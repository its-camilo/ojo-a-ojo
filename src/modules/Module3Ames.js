import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { makeCheckerTexture, makeWallTexture, makeMarbleTexture, makeWoodTexture } from './amesTextures.js';
import { installStudioEnvironment, addStudioLights } from '../utils/pbrEnvironment.js';

function buildStylizedFigure(colors) {
  const fig = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: colors.skin, roughness: 0.55 });
  const cloth = new THREE.MeshStandardMaterial({ color: colors.cloth, roughness: 0.72 });
  const pants = new THREE.MeshStandardMaterial({ color: colors.pants, roughness: 0.8 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 20), skin);
  head.position.y = 0.72;
  head.castShadow = true;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.16), cloth);
  torso.position.y = 0.38;
  torso.castShadow = true;

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.15), pants);
  pelvis.position.y = 0.12;

  const limb = (x, y, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 10), mat);
    m.position.set(x, y, 0);
    m.castShadow = true;
    return m;
  };

  fig.add(
    head,
    torso,
    pelvis,
    limb(-0.18, 0.5, cloth),
    limb(0.18, 0.5, cloth),
    limb(-0.1, -0.08, pants),
    limb(0.1, -0.08, pants)
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
    this._envHandle = null;
    this._buildRoom();
  }

  _trapezoidFloorGeometry(nearW, farW, depth, y = 0) {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -nearW / 2, y, 0,
      nearW / 2, y, 0,
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
    this._envHandle = installStudioEnvironment(this.stereo.renderer, this.stereo.scene);
    this.stereo.scene.background = new THREE.Color(0x0c1018);

    const room = new THREE.Group();
    const nearW = 4.4;
    const farW = 1.45;
    const depth = 6;
    const ceilingY = 2.75;

    const checker = makeCheckerTexture('#c8b8a4', '#4a3f36', 12);
    checker.repeat.set(5, 8);
    const woodTex = makeWoodTexture();
    woodTex.repeat.set(3, 3);
    const wallTex = makeWallTexture();
    const marbleTex = makeMarbleTexture();
    marbleTex.repeat.set(2, 1);

    const floorMat = new THREE.MeshStandardMaterial({ map: checker, roughness: 0.82, metalness: 0.02 });
    const floor = new THREE.Mesh(this._trapezoidFloorGeometry(nearW, farW, depth, -0.65), floorMat);
    floor.position.z = -0.55;
    floor.receiveShadow = true;
    room.add(floor);

    const ceilingMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.88 });
    const ceiling = new THREE.Mesh(this._trapezoidFloorGeometry(nearW, farW, depth, 0), ceilingMat);
    ceiling.rotation.x = Math.PI;
    ceiling.position.set(0, ceilingY, -0.55);
    room.add(ceiling);

    const wainscotH = 1.1;
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.78 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(farW, ceilingY - 0.25), wallMat);
    back.position.set(0, ceilingY / 2 - 0.1, -depth - 0.48);
    room.add(back);

    const sideMatLower = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.65 });
    const sideMatUpper = new THREE.MeshStandardMaterial({ color: 0xd8d0c6, roughness: 0.82 });
    for (const sign of [-1, 1]) {
      const lower = new THREE.Mesh(new THREE.PlaneGeometry(depth, wainscotH), sideMatLower);
      lower.rotation.y = (sign * Math.PI) / 2;
      lower.position.set((sign * nearW) / 2, wainscotH / 2 - 0.2, -depth / 2 - 0.2);
      const upper = new THREE.Mesh(new THREE.PlaneGeometry(depth, ceilingY - wainscotH - 0.3), sideMatUpper);
      upper.rotation.y = (sign * Math.PI) / 2;
      upper.position.set((sign * nearW) / 2, wainscotH + (ceilingY - wainscotH) / 2 - 0.35, -depth / 2 - 0.2);
      room.add(lower, upper);
    }

    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(nearW, 0.08, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x5c4a3a, roughness: 0.7 })
    );
    baseboard.position.set(0, -0.61, -0.1);
    room.add(baseboard);

    const winFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.45, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xe8e0d6, roughness: 0.5 })
    );
    winFrame.position.set(0.35, 1.35, -depth - 0.35);
    room.add(winFrame);

    const beam = new THREE.SpotLight(0xfff5e0, 2.4, 14, 0.4, 0.35);
    beam.position.set(0.2, 2.1, -1.2);
    beam.target.position.set(0, -0.2, -3.5);
    beam.castShadow = true;
    room.add(beam, beam.target);

    addStudioLights(room, { keyInt: 0.9, fillInt: 0.35, ambient: 0.25 });

    const figA = buildStylizedFigure({
      skin: 0xe8b898,
      cloth: 0xd45d48,
      pants: 0x2c3e50,
    });
    figA.position.set(-0.95, -0.62, -0.75);
    figA.rotation.y = 0.35;

    const figB = buildStylizedFigure({
      skin: 0xd4a888,
      cloth: 0x3b6ea8,
      pants: 0x3d342a,
    });
    figB.position.set(0.62, -0.62, -4.15);
    figB.scale.setScalar(2.05);
    figB.rotation.y = -0.25;
    room.add(figA, figB);

    this.group.add(room);

    this.ui = new THREE.Group();
    this._buildPromptButtons();
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
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    this._envHandle?.dispose();
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