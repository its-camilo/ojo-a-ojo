import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { buildHollowFaceGeometry } from './hollowFaceGeometry.js';

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
    const key = new THREE.DirectionalLight(0xfff8f0, 1.5);
    key.position.set(0.2, 2.8, 2.2);
    this.group.add(key);
    const fill = new THREE.DirectionalLight(0xb8d4ff, 0.35);
    fill.position.set(-1.5, 0.5, 1);
    this.group.add(fill);
    this.group.add(new THREE.AmbientLight(0xf0ebe3, 0.55));

    const geo = buildHollowFaceGeometry();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf3ece4,
      roughness: 0.42,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    this.mask = new THREE.Mesh(geo, mat);
    this.mask.position.set(0, 0.38, -2.45);
    this.mask.rotation.x = -0.08;
    this.group.add(this.mask);

    this.ui = new THREE.Group();
    this._promptButtons();
    this.group.add(this.ui);

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
        ' Patrón observado: ilusión más fuerte en monocular; estereopsis ayudó a desambiguar a corta distancia (Hill y Bruce, 1993).';
    }
    interpretation += ' Resultado exploratorio, no diagnóstico clínico.';

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