import * as THREE from 'three';
import balanceVert from '../shaders/dichoptic-balance.vert.glsl?raw';
import balanceFrag from '../shaders/dichoptic-balance.frag.glsl?raw';
import { injectColorOps, prepareGlslForThree } from '../rendering/shaderBuild.js';
import { Staircase1up1down } from '../domain/psychophysics.js';
import { LAYER_LEFT, LAYER_RIGHT } from '../rendering/StereoRenderer.js';
import { createButtonRow } from './uiLayout.js';
import { installStudioEnvironment, addStudioLights } from '../rendering/pbrEnvironment.js';
import { disposeObject3D } from '../rendering/sceneDispose.js';

export class Module1Balance {
  constructor(stereo, onComplete) {
    this.stereo = stereo;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.staircase = new Staircase1up1down({ start: 0.5, step: 0.05 });
    this.leftContrast = 0.5;
    this.rightContrast = 0.5;
    this._envHandle = null;
    this._buildEnvironment();
    this._buildScene();
    this._buildUI();
  }

  _buildEnvironment() {
    this._envHandle = installStudioEnvironment(this.stereo.renderer, this.stereo.scene);
    this.stereo.scene.background = new THREE.Color(0x060a12);
    addStudioLights(this.group, { keyInt: 2.0, fillInt: 0.55, ambient: 0.22 });
    this.group.add(new THREE.HemisphereLight(0xa8c8ff, 0x0a0e16, 0.42));
  }

  _buildScene() {
    const matLeft = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: prepareGlslForThree(balanceVert),
      fragmentShader: injectColorOps(balanceFrag),
      uniforms: {
        contrastLeftLin: { value: 1 },
        contrastRightLin: { value: 1 },
        eyePass: { value: 1 },
        baseColor: { value: new THREE.Color(0x7ab8ff) },
      },
    });
    const matRight = matLeft.clone();
    matRight.uniforms.eyePass.value = 2;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.62, 0.12, 28),
      new THREE.MeshPhysicalMaterial({
        color: 0x1e2a40,
        metalness: 0.72,
        roughness: 0.16,
        clearcoat: 0.85,
        clearcoatRoughness: 0.08,
        reflectivity: 1,
      })
    );
    pedestal.position.set(0, -0.72, -2.35);
    pedestal.receiveShadow = true;
    pedestal.layers.set(LAYER_LEFT);
    pedestal.layers.enable(LAYER_RIGHT);
    this.group.add(pedestal);

    const pedestalDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.54, 32),
      new THREE.MeshStandardMaterial({
        color: 0x9ab4e8,
        metalness: 0.95,
        roughness: 0.08,
        emissive: 0x1a2848,
        emissiveIntensity: 0.15,
      })
    );
    pedestalDisc.rotation.x = -Math.PI / 2;
    pedestalDisc.position.set(0, -0.655, -2.35);
    pedestalDisc.layers.enable(LAYER_LEFT);
    pedestalDisc.layers.enable(LAYER_RIGHT);
    this.group.add(pedestalDisc);

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.025, 8, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x2a3d5c, metalness: 0.7, roughness: 0.35 })
    );
    arch.rotation.x = Math.PI / 2;
    arch.position.set(0, 0.05, -2.55);
    arch.layers.enable(LAYER_LEFT);
    arch.layers.enable(LAYER_RIGHT);
    this.group.add(arch);

    const lensBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.18, 32),
      new THREE.MeshPhysicalMaterial({
        color: 0x28344c,
        metalness: 0.88,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      })
    );
    lensBody.rotation.x = Math.PI / 2;
    lensBody.position.set(0, 0.12, -2.38);
    lensBody.layers.enable(LAYER_LEFT);
    lensBody.layers.enable(LAYER_RIGHT);
    this.group.add(lensBody);

    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.2 + i * 0.082, 0.011, 12, 32),
        new THREE.MeshStandardMaterial({
          color: 0xd0e0f8,
          emissive: 0x2a4060,
          emissiveIntensity: 0.12,
          metalness: 0.97,
          roughness: 0.08,
        })
      );
      ring.position.set(0, 0.12, -2.38);
      ring.layers.enable(LAYER_LEFT);
      ring.layers.enable(LAYER_RIGHT);
      this.group.add(ring);
    }

    const torusL = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.07, 48, 8), matLeft);
    torusL.layers.set(LAYER_LEFT);
    torusL.position.set(-0.28, 0.22, -2.32);
    torusL.castShadow = true;

    const prismR = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), matRight);
    prismR.layers.set(LAYER_RIGHT);
    prismR.position.set(0.3, -0.02, -2.28);
    prismR.castShadow = true;

    const rodL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 20), matLeft);
    rodL.layers.set(LAYER_LEFT);
    rodL.position.set(-0.42, -0.35, -2.05);
    rodL.rotation.z = 0.25;

    const sphereR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), matRight);
    sphereR.layers.set(LAYER_RIGHT);
    sphereR.position.set(0.48, 0.38, -2.12);

    const dust = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          Array.from({ length: 200 * 3 }, () => (Math.random() - 0.5) * 3.5),
          3
        )
      ),
      new THREE.PointsMaterial({ color: 0x5a7ab0, size: 0.012, opacity: 0.35, transparent: true })
    );
    dust.position.set(0, 0, -2.2);
    dust.layers.enable(LAYER_LEFT);
    dust.layers.enable(LAYER_RIGHT);
    this.group.add(dust);

    this.materials = { left: matLeft, right: matRight };
    this.group.add(torusL, prismR, rodL, sphereR);
    this._syncContrasts();
  }

  _syncContrasts() {
    const weak = this.leftContrast;
    const dom = this.rightContrast;
    this.materials.left.uniforms.contrastLeftLin.value = weak;
    this.materials.right.uniforms.contrastRightLin.value = dom;
    this.materials.left.uniforms.contrastRightLin.value = weak;
    this.materials.right.uniforms.contrastLeftLin.value = dom;
  }

  _buildUI() {
    this.ui = new THREE.Group();
    createButtonRow([
      {
        label: 'Domina Izquierda\n(veo más claro el ojo izq.)',
        onSelect: () => this._trial(false),
      },
      {
        label: 'Domina Derecha\n(veo más claro el ojo der.)',
        onSelect: () => this._trial(true),
      },
      {
        label: 'Equilibrado\n(ambos ojos igual)',
        onSelect: () => this._trialBalanced(),
      },
    ], { preset: 'balance' }).forEach((b) => this.ui.add(b));
    this.group.add(this.ui);
  }

  _trial(reportRight) {
    const est = this.staircase.record(reportRight);
    if (est.done) this._finish();
    this.leftContrast = est.imbalanceRatio;
    this.rightContrast = 1.0;
    this._syncContrasts();
  }

  _trialBalanced() {
    const est = this.staircase.recordBalanced();
    if (est.done) this._finish();
    this.leftContrast = est.imbalanceRatio;
    this.rightContrast = 1.0;
    this._syncContrasts();
  }

  _finish() {
    const est = this.staircase.getEstimate();
    this.onComplete({
      moduleId: 'balance',
      title: 'Balance dicóptico 3D',
      imbalanceRatio: est.imbalanceRatio,
      valid: est.valid,
      reversals: est.reversals,
      trials: est.trials,
      interpretation:
        'Indicio exploratorio de desequilibrio interocular en contraste (estilo Martín et al., 2020). IR≈1 sugiere equilibrio relativo; valores alejados de 1 merecen consulta profesional.',
    });
  }

  mount() {
    this.stereo.renderer.toneMappingExposure = 1.18;
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    this.materials.left.dispose();
    this.materials.right.dispose();
    this._envHandle?.dispose();
    disposeObject3D(this.group);
    this.group = new THREE.Group();
  }

  getInteractables() {
    return this.ui.children;
  }

  onGazeSelect(mesh) {
    mesh.userData.onSelect?.();
  }

  completeForE2e() {
    this._trial(false);
    this._trial(true);
    this._trial(false);
    this._finish();
  }
}