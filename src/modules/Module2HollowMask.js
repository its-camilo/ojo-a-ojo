import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { buildHollowFaceGeometry } from './hollowFaceGeometry.js';
import { makePlasterTexture } from '../utils/proceduralTextures.js';
import { enableSharedStereoLayers } from '../utils/stereoLayers.js';

export class Module2HollowMask {
  constructor(stereo, monoRound, onComplete) {
    this.stereo = stereo;
    this.monoRound = monoRound;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.phase = 'mono';
    this.answers = {};
    this._buildScene();
  }

  _buildScene() {
    this.stereo.scene.background = new THREE.Color(0x0a0e14);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 48),
      new THREE.MeshStandardMaterial({ color: 0x161c24, roughness: 0.92, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.95, -2.4);
    this.group.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2),
      new THREE.MeshStandardMaterial({ color: 0x1c242e, roughness: 0.95, side: THREE.DoubleSide })
    );
    wall.position.set(0, 0.15, -3.35);
    this.group.add(wall);

    const key = new THREE.DirectionalLight(0xe8dcd0, 0.78);
    key.position.set(0.35, 0.95, 0.15);
    const rim = new THREE.DirectionalLight(0xb8a898, 0.38);
    rim.position.set(1.5, 0.35, -1.05);
    const fill = new THREE.DirectionalLight(0x98a8c0, 0.3);
    fill.position.set(-1.3, 0.2, -0.35);
    const lowFill = new THREE.PointLight(0xc8b0a0, 0.38, 8);
    lowFill.position.set(0.12, -0.22, -1.55);
    this.group.add(
      key,
      rim,
      fill,
      lowFill,
      new THREE.AmbientLight(0xb0b8c8, 0.62),
      new THREE.HemisphereLight(0xe8e0d4, 0x282c34, 0.48)
    );

    const plasterMap = makePlasterTexture();
    plasterMap.repeat.set(2, 2);
    const geo = buildHollowFaceGeometry();
    const mat = new THREE.MeshLambertMaterial({
      map: plasterMap,
      color: 0xcfc6b8,
      side: THREE.DoubleSide,
    });
    this.mask = new THREE.Mesh(geo, mat);
    this.mask.position.set(0, 0.32, -2.42);
    this.mask.rotation.x = -0.06;
    this.group.add(this.mask);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.9, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.65, metalness: 0.1 })
    );
    plinth.position.set(0, -0.5, -2.55);
    this.group.add(plinth);

    this.ui = new THREE.Group();
    this._promptButtons();
    this.group.add(this.ui);
    enableSharedStereoLayers(this.group);

    this.stereo.setMono(this.phase === 'mono');
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
    this.stereo.scene.background = new THREE.Color(0x0a0e14);
    this.stereo.scene.environment = null;
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    this.mask.geometry.dispose();
    this.mask.material.dispose();
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