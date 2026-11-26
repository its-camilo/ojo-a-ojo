import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { makeCheckerTexture, makeWallTexture } from './amesTextures.js';

export class Module3Ames {
  constructor(stereo, monoRound, onComplete) {
    this.stereo = stereo;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.phase = 'mono';
    this.answer = null;
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
    const idx = [0, 1, 2, 0, 2, 3];
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  _buildRoom() {
    const room = new THREE.Group();
    const nearW = 4.2;
    const farW = 1.6;
    const depth = 5.5;
    const ceilingY = 2.6;

    const checker = makeCheckerTexture();
    const wallTex = makeWallTexture();

    const floorMat = new THREE.MeshStandardMaterial({ map: checker, roughness: 0.85 });
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: checker.clone(),
      roughness: 0.9,
    });
    ceilingMat.map.repeat.set(3, 5);

    const floor = new THREE.Mesh(this._trapezoidFloorGeometry(nearW, farW, depth, -0.6), floorMat);
    floor.position.z = -0.5;
    room.add(floor);

    const ceiling = new THREE.Mesh(
      this._trapezoidFloorGeometry(nearW, farW, depth, 0),
      ceilingMat
    );
    ceiling.rotation.x = Math.PI;
    ceiling.position.set(0, ceilingY, -0.5);
    room.add(ceiling);

    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.75 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(farW, ceilingY - 0.3), wallMat);
    back.position.set(0, ceilingY / 2 - 0.15, -depth - 0.5);
    room.add(back);

    const sideMat = new THREE.MeshStandardMaterial({ color: 0xa89888, roughness: 0.8 });
    const left = new THREE.Mesh(new THREE.PlaneGeometry(depth, ceilingY), sideMat);
    left.rotation.y = Math.PI / 2;
    left.position.set(-nearW / 2, ceilingY / 2 - 0.3, -depth / 2 - 0.25);
    room.add(left);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(depth, ceilingY), sideMat);
    right.rotation.y = -Math.PI / 2;
    right.position.set(nearW / 2, ceilingY / 2 - 0.3, -depth / 2 - 0.25);
    room.add(right);

    const figGeo = new THREE.SphereGeometry(0.28, 32, 24);
    const figMatA = new THREE.MeshStandardMaterial({
      color: 0xff8c42,
      emissive: 0x331800,
      roughness: 0.35,
    });
    const figMatB = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x0a2e28,
      roughness: 0.35,
    });
    const figA = new THREE.Mesh(figGeo, figMatA);
    figA.position.set(-0.85, -0.15, -0.85);
    const figB = new THREE.Mesh(figGeo, figMatB);
    figB.position.set(0.55, -0.15, -3.9);
    figB.scale.setScalar(1.95);
    room.add(figA, figB);

    const roomLight = new THREE.PointLight(0xfff5e8, 2.2, 18);
    roomLight.position.set(0, 1.8, -1.5);
    room.add(roomLight);
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(0, 5, 3);
    room.add(sun);
    room.add(new THREE.AmbientLight(0xd4dae8, 0.65));

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
      'Cuarto trapezoidal (Ames): la perspectiva forzada altera la escala percibida (Ittelson, 1952; Gehringer y Engel, 1986). Compare si la estereopsis atenúa la ilusión entre rondas. Sin tracking de traslación (3DoF). Indicio exploratorio únicamente.';

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