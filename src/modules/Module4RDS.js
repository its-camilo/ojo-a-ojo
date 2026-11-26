import * as THREE from 'three';
import rdsVert from '../shaders/rds-particles.vert.glsl?raw';
import rdsFrag from '../shaders/rds-particles.frag.glsl?raw';
import { injectColorOps, prepareGlslForThree } from '../utils/shaderBuild.js';
import { disparityPxToArcsec } from '../utils/arcsec.js';
import { LAYER_LEFT, LAYER_RIGHT } from '../viewer/StereoRenderer.js';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';

export class Module4RDS {
  constructor(stereo, calibration, monoRound, onComplete) {
    this.stereo = stereo;
    this.calibration = calibration;
    this.monoRound = monoRound;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.disparityPx = 6;
    this.phase = 'mono';
    this._buildPointCloud();
    this._buildUI();
    this.stereo.setMono(this.phase === 'mono');
  }

  _buildPointCloud() {
    const count = 2400;
    const spread = 2.2;
    const halfDisp = (this.disparityPx / (this.calibration.ppi || 400)) * 0.012;

    const seedGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      defines: { USE_INSTANCING: '' },
      vertexShader: prepareGlslForThree(rdsVert),
      fragmentShader: injectColorOps(rdsFrag),
    });

    this.pointsLeft = new THREE.InstancedMesh(seedGeo, mat, count);
    this.pointsLeft.layers.set(LAYER_LEFT);
    this.pointsRight = new THREE.InstancedMesh(seedGeo, mat.clone(), count);
    this.pointsRight.layers.set(LAYER_RIGHT);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread;
      const ly = (Math.random() - 0.5) * spread * 0.55;
      const y = ly + 0.35;
      const z = (Math.random() - 0.5) * 0.35 - 2.55;
      const inSquare = Math.abs(x) < 0.35 && Math.abs(ly) < 0.35;
      const disp = inSquare ? halfDisp : 0;

      dummy.position.set(x - disp, y, z);
      dummy.updateMatrix();
      this.pointsLeft.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x + disp, y, z);
      dummy.updateMatrix();
      this.pointsRight.setMatrixAt(i, dummy.matrix);
    }
    this.pointsLeft.instanceMatrix.needsUpdate = true;
    this.pointsRight.instanceMatrix.needsUpdate = true;

    this.group.add(this.pointsLeft, this.pointsRight);
  }

  _buildUI() {
    if (!this.ui) this.ui = new THREE.Group();
    clearGroup(this.ui);
    const tag = this.phase === 'mono' ? 'Mono' : 'Estéreo';
    createButtonRow([
      { label: `${tag}: Adelante`, onSelect: () => this._answer('near') },
      { label: `${tag}: Atrás`, onSelect: () => this._answer('far') },
      { label: `${tag}: No veo`, onSelect: () => this._answer('none') },
    ]).forEach((b) => this.ui.add(b));
    if (!this.ui.parent) this.group.add(this.ui);
  }

  _answer(depth) {
    if (this.phase === 'mono') {
      this.monoAnswer = depth;
      this.phase = 'stereo';
      this.stereo.setMono(false);
      clearGroup(this.ui);
      this._buildUI();
      return;
    }
    const arc = disparityPxToArcsec(this.calibration.ppi, this.disparityPx);
    this.onComplete({
      moduleId: 'rds',
      title: 'RDS 3D grueso (Julesz)',
      disparityPx: this.disparityPx,
      disparityArcsec: arc,
      monoDepth: this.monoAnswer ?? depth,
      stereoDepth: depth,
      interpretation:
        `Tamizaje de estereopsis global gruesa (Julesz, 1960; Bonfanti et al., 2015: ~124–157 arcsec/px en móviles). No mide estereoagudeza clínica fina. Si no percibe figura solo en estéreo, indício de limitación binocular; consultar profesional.`,
    });
  }

  mount() {
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    this.pointsLeft.material.dispose();
    this.pointsRight.material.dispose();
    this.pointsLeft.geometry.dispose();
  }

  getInteractables() {
    return this.ui.children;
  }

  onGazeSelect(mesh) {
    mesh.userData.onSelect?.();
  }

  completeForE2e() {
    this._answer('near');
    this._answer('near');
  }
}