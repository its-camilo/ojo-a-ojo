import * as THREE from 'three';
import rdsVert from '../shaders/rds-particles.vert.glsl?raw';
import rdsFrag from '../shaders/rds-particles.frag.glsl?raw';
import { injectColorOps, prepareGlslForThree } from '../rendering/shaderBuild.js';
import { disparityPxToArcsec } from '../domain/arcsec.js';
import { LAYER_LEFT, LAYER_RIGHT } from '../rendering/StereoRenderer.js';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { installStudioEnvironment, addStudioLights } from '../rendering/pbrEnvironment.js';
import { disposeObject3D } from '../rendering/sceneDispose.js';

export class Module4RDS {
  constructor(stereo, calibration, monoRound, onComplete) {
    this.stereo = stereo;
    this.calibration = calibration;
    this.monoRound = monoRound;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.disparityPx = 6;
    this.phase = 'mono';
    this._envHandle = null;
    this._buildFrame();
    this._buildPointCloud();
    this._buildUI();
    this.stereo.setMono(this.phase === 'mono');
  }

  _buildFrame() {
    this._envHandle = installStudioEnvironment(this.stereo.renderer, this.stereo.scene);
    this.stereo.scene.background = new THREE.Color(0x070b12);
    addStudioLights(this.group, { keyInt: 1.45, fillInt: 0.65, ambient: 0.28 });

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.55, 0.22),
      new THREE.MeshPhysicalMaterial({
        color: 0x2a3a52,
        emissive: 0x142030,
        emissiveIntensity: 0.25,
        metalness: 0.7,
        roughness: 0.28,
        clearcoat: 0.55,
      })
    );
    housing.position.set(0, 0.15, -2.72);
    housing.layers.enable(LAYER_LEFT);
    housing.layers.enable(LAYER_RIGHT);
    this.group.add(housing);

    const bevel = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.022, 8, 32),
      new THREE.MeshStandardMaterial({
        color: 0xc8e6ff,
        emissive: 0x3d6a9e,
        emissiveIntensity: 0.35,
        metalness: 0.85,
        roughness: 0.12,
      })
    );
    bevel.position.set(0, 0.18, -2.58);
    bevel.layers.enable(LAYER_LEFT);
    bevel.layers.enable(LAYER_RIGHT);
    this.group.add(bevel);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 1.15),
      new THREE.MeshPhysicalMaterial({
        color: 0xaac0e0,
        transparent: true,
        opacity: 0.12,
        metalness: 0,
        roughness: 0.05,
        transmission: 0.85,
      })
    );
    glass.position.set(0, 0.2, -2.59);
    glass.layers.enable(LAYER_LEFT);
    glass.layers.enable(LAYER_RIGHT);
    this.group.add(glass);
  }

  _buildPointCloud() {
    const count = 2800;
    const spread = 2;
    const halfDisp = (this.disparityPx / (this.calibration.ppi || 400)) * 0.012;

    const seedGeo = new THREE.SphereGeometry(0.016, 8, 8);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xd6eeff,
      emissive: 0x4a98e8,
      emissiveIntensity: 0.72,
      metalness: 0.1,
      roughness: 0.14,
      clearcoat: 0.5,
    });

    this.pointsLeft = new THREE.InstancedMesh(seedGeo, mat, count);
    this.pointsLeft.layers.set(LAYER_LEFT);
    this.pointsRight = new THREE.InstancedMesh(seedGeo, mat.clone(), count);
    this.pointsRight.layers.set(LAYER_RIGHT);

    const dummy = new THREE.Object3D();
  const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread;
      const ly = (Math.random() - 0.5) * spread * 0.5;
      const y = ly + 0.25;
      const z = (Math.random() - 0.5) * 0.28 - 2.62;
      const inSquare = Math.abs(x) < 0.38 && Math.abs(ly) < 0.38;
      const disp = inSquare ? halfDisp : 0;
      const scale = inSquare ? 1.15 + Math.random() * 0.15 : 0.75 + Math.random() * 0.2;

      dummy.position.set(x - disp, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this.pointsLeft.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x + disp, y, z);
      dummy.updateMatrix();
      this.pointsRight.setMatrixAt(i, dummy.matrix);

      if (inSquare) {
        color.setHSL(0.56, 0.5, 0.76 + Math.random() * 0.1);
      } else {
        color.setHSL(0.58, 0.35, 0.56 + Math.random() * 0.12);
      }
      this.pointsLeft.setColorAt(i, color);
      this.pointsRight.setColorAt(i, color);
    }
    this.pointsLeft.instanceMatrix.needsUpdate = true;
    this.pointsRight.instanceMatrix.needsUpdate = true;
    this.pointsLeft.instanceColor.needsUpdate = true;
    this.pointsRight.instanceColor.needsUpdate = true;

    this.group.add(this.pointsLeft, this.pointsRight);

    const dotLight = new THREE.PointLight(0xd6eeff, 3.2, 9);
    dotLight.position.set(0, 0.35, -2.55);
    dotLight.layers.enable(LAYER_LEFT);
    dotLight.layers.enable(LAYER_RIGHT);
    this.group.add(dotLight);
  }

  _buildUI() {
    if (!this.ui) this.ui = new THREE.Group();
    clearGroup(this.ui);
    const phase = this.phase === 'mono' ? 'Un ojo' : 'Dos ojos';
    createButtonRow([
      {
        label: `Sobresale\n(${phase} · sale hacia mí)`,
        onSelect: () => this._answer('near'),
      },
      {
        label: `Se hunde\n(${phase} · va hacia atrás)`,
        onSelect: () => this._answer('far'),
      },
      {
        label: `Plano / No veo\n(${phase} · sin relieve 3D)`,
        onSelect: () => this._answer('none'),
      },
    ], { preset: 'rds' }).forEach((b) => this.ui.add(b));
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
        `Tamizaje de estereopsis global gruesa (Julesz, 1960; Bonfanti et al., 2015). No mide estereoagudeza clínica fina. Si no percibe figura solo en estéreo, puede haber limitación binocular.`,
    });
  }

  mount() {
    this.stereo.renderer.toneMappingExposure = 1.38;
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    this._envHandle?.dispose();
    disposeObject3D(this.group);
    this.group = new THREE.Group();
    this.pointsLeft = null;
    this.pointsRight = null;
    this.ui = null;
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