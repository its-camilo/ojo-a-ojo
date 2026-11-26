import * as THREE from 'three';
import { createGazeButton } from './createInteractable.js';
import { clearGroup } from './clearGroup.js';

function buildConcaveFaceGeometry() {
  const geo = new THREE.SphereGeometry(0.9, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.85);
  geo.scale(1, 1.15, 0.55);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const concave = z * (1 - 0.35 * Math.exp(-(x * x + y * y) * 1.2));
    pos.setZ(i, concave);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

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
    const light = new THREE.DirectionalLight(0xfff5e6, 1.1);
    light.position.set(0, 3, 1.5);
    this.group.add(light);
    this.group.add(new THREE.AmbientLight(0x404860, 0.35));

    const geo = buildConcaveFaceGeometry();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd4c4b0,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    this.mask = new THREE.Mesh(geo, mat);
    this.mask.position.set(0, 0.2, -2.2);
    this.mask.rotation.x = -0.15;
    this.group.add(this.mask);

    this.ui = new THREE.Group();
    this._promptButtons();
    this.group.add(this.ui);

    this.stereo.setMono(this.phase === 'mono');
  }

  _promptButtons() {
    clearGroup(this.ui);
    const phaseLabel = this.phase === 'mono' ? 'MONOCULAR (ipd=0)' : 'ESTÉREO';
    this.ui.add(
      createGazeButton(`Ronda ${phaseLabel}: CONVEXA (saliente)`, new THREE.Vector3(-1.15, -0.75, -1.4), () =>
        this._answer('convex')
      )
    );
    this.ui.add(
      createGazeButton(`Ronda ${phaseLabel}: CÓNCAVA (hueca)`, new THREE.Vector3(1.15, -0.75, -1.4), () =>
        this._answer('concave')
      )
    );
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