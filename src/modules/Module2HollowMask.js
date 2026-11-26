import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { buildHollowFaceGeometry } from './hollowFaceGeometry.js';
import { installStudioEnvironment, addStudioLights } from '../utils/pbrEnvironment.js';
import { makePlasterTexture, makeRoughnessFromCanvas } from '../utils/proceduralTextures.js';

export class Module2HollowMask {
  constructor(stereo, monoRound, onComplete) {
    this.stereo = stereo;
    this.monoRound = monoRound;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.phase = 'mono';
    this.answers = {};
    this._envHandle = null;
    this._buildScene();
  }

  _buildScene() {
    this._envHandle = installStudioEnvironment(this.stereo.renderer, this.stereo.scene);
    this.stereo.scene.background = new THREE.Color(0x080c10);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 48),
      new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.9, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.95, -2.4);
    floor.receiveShadow = true;
    this.group.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2),
      new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.95 })
    );
    wall.position.set(0, 0.15, -3.35);
    this.group.add(wall);

    const lights = addStudioLights(this.group, { keyInt: 0.35, fillInt: 0.15, ambient: 0.08 });
    const ugraze = new THREE.SpotLight(0xfff0d8, 3.2, 12, 0.55, 0.4);
    ugraze.position.set(0.1, -0.4, -1.4);
    ugraze.target.position.set(0, 0.35, -2.5);
    ugraze.castShadow = true;
    this.group.add(ugraze, ugraze.target);

    const plasterMap = makePlasterTexture();
    plasterMap.repeat.set(2, 2);
    const roughMap = makeRoughnessFromCanvas(plasterMap, 0.42);

    const geo = buildHollowFaceGeometry();
    const mat = new THREE.MeshPhysicalMaterial({
      map: plasterMap,
      roughnessMap: roughMap,
      color: 0xf2ebe3,
      roughness: 0.52,
      metalness: 0.02,
      clearcoat: 0.08,
      side: THREE.DoubleSide,
    });
    this.mask = new THREE.Mesh(geo, mat);
    this.mask.position.set(0, 0.32, -2.42);
    this.mask.rotation.x = -0.06;
    this.mask.castShadow = true;
    this.mask.receiveShadow = true;
    this.group.add(this.mask);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.9, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.55, metalness: 0.2 })
    );
    plinth.position.set(0, -0.5, -2.55);
    plinth.castShadow = true;
    this.group.add(plinth);

    this.ui = new THREE.Group();
    this._promptButtons();
    this.group.add(this.ui);

    this.stereo.setMono(this.phase === 'mono');
    void lights;
  }

  _promptButtons() {
    clearGroup(this.ui);
    const tag = this.phase === 'mono' ? 'Mono' : 'Estéreo';
    createButtonRow([
      { label: `${tag}: Convexa`, onSelect: () => this._answer('convex') },
      { label: `${tag}: Cóncava`, onSelect: () => this._answer('concave') },
    ]).forEach((b) => this.ui.add(b));
  }

  _answer(percept) {
    this.answers[this.phase] = percept;
    if (this.phase === 'mono') {
      this.phase = 'stereo';
      this.stereo.setMono(false);
      this._promptButtons();
    } else {
      this._finish();
    }
  }

  _finish() {
    const mono = this.answers.mono || 'sin respuesta';
    const stereo = this.answers.stereo || this.answers.mono || 'sin respuesta';
    let interpretation =
      'La máscara hueca suele percibirse convexa sin disparidad (Gregory, 1970; Hill y Bruce, 1993). Si en estéreo reporta concavidad o cambia el juicio, puede haber uso de disparidad binocular.';
    if (mono === 'convex' && stereo === 'concave') {
      interpretation +=
        ' Patrón observado: ilusión más fuerte en monocular; estereopsis ayudó a desambiguar a corta distancia.';
    }

    this.onComplete({
      moduleId: 'hollow-mask',
      title: 'Máscara hueca 3D',
      monoPercept: mono,
      stereoPercept: stereo,
      interpretation,
    });
  }

  mount() {
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    this.mask.geometry.dispose();
    this.mask.material.dispose();
    this._envHandle?.dispose();
  }

  getInteractables() {
    return this.ui.children;
  }

  onGazeSelect(mesh) {
    mesh.userData.onSelect?.();
  }

  completeForE2e() {
    this._answer('convex');
    this._answer('concave');
  }
}