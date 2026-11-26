import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { buildHollowFaceGeometry } from './hollowFaceGeometry.js';
import { makePlasterTexture } from '../rendering/proceduralTextures.js';
import { enableSharedStereoLayers } from '../rendering/stereoLayers.js';
import { disposeObject3D } from '../rendering/sceneDispose.js';

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
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.42, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.92, -2.35);
    this.group.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xd8dce6, roughness: 0.88, side: THREE.DoubleSide })
    );
    wall.position.set(0, 0.12, -3.28);
    this.group.add(wall);

    const niche = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.85),
      new THREE.MeshStandardMaterial({ color: 0xecedf2, roughness: 0.92 })
    );
    niche.position.set(0, 0.22, -3.24);
    this.group.add(niche);

    const key = new THREE.DirectionalLight(0xfff8f0, 1.05);
    key.position.set(0.55, 0.85, 0.35);
    const rim = new THREE.DirectionalLight(0xc8d0e0, 0.42);
    rim.position.set(1.6, 0.55, -0.65);
    const fill = new THREE.DirectionalLight(0xe8ecf4, 0.55);
    fill.position.set(-1.2, 0.35, 0.15);
    const lowFill = new THREE.PointLight(0xfff0e8, 0.72, 9);
    lowFill.position.set(0.05, -0.18, -1.45);
    this.group.add(
      key,
      rim,
      fill,
      lowFill,
      new THREE.AmbientLight(0xf0ece6, 0.55),
      new THREE.HemisphereLight(0xf8f4ee, 0xc8c4bc, 0.42)
    );

    const plasterMap = makePlasterTexture();
    plasterMap.repeat.set(2, 2);
    const geo = buildHollowFaceGeometry();
    const mat = new THREE.MeshStandardMaterial({
      map: plasterMap,
      color: 0xe6dfd3,
      roughness: 0.55,
      metalness: 0.02,
      emissive: 0x6a645c,
      emissiveIntensity: 0.06,
      side: THREE.DoubleSide,
    });
    this.mask = new THREE.Mesh(geo, mat);
    this.mask.position.set(0, 0.34, -2.38);
    this.mask.rotation.x = -0.05;
    this.group.add(this.mask);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.88, 20),
      new THREE.MeshStandardMaterial({ color: 0xe0dcd4, roughness: 0.38, metalness: 0.08 })
    );
    plinth.position.set(0, -0.48, -2.5);
    const plinthCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.24, 0.06, 20),
      new THREE.MeshStandardMaterial({ color: 0xd4d0c8, roughness: 0.3, metalness: 0.12 })
    );
    plinthCap.position.set(0, -0.02, -2.5);
    this.group.add(plinth, plinthCap);

    this.ui = new THREE.Group();
    this._promptButtons();
    this.group.add(this.ui);
    enableSharedStereoLayers(this.group);

    this.stereo.setMono(this.phase === 'mono');
  }

  _promptButtons() {
    clearGroup(this.ui);
    const phase = this.phase === 'mono' ? 'Un ojo' : 'Dos ojos';
    createButtonRow([
      {
        label: `Convexa\n(${phase} · sale hacia afuera)`,
        onSelect: () => this._answer('convex'),
      },
      {
        label: `Cóncava\n(${phase} · hueca hacia adentro)`,
        onSelect: () => this._answer('concave'),
      },
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
    this.stereo.scene.background = new THREE.Color(0xc8ccd6);
    this.stereo.scene.environment = null;
    this.stereo.renderer.toneMappingExposure = 1.14;
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    disposeObject3D(this.group);
    this.group = new THREE.Group();
    this.mask = null;
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