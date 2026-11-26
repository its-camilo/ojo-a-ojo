import * as THREE from 'three';
import balanceVert from '../shaders/dichoptic-balance.vert.glsl?raw';
import balanceFrag from '../shaders/dichoptic-balance.frag.glsl?raw';
import { injectColorOps, prepareGlslForThree } from '../utils/shaderBuild.js';
import { Staircase1up1down } from '../utils/psychophysics.js';
import { LAYER_LEFT, LAYER_RIGHT } from '../viewer/StereoRenderer.js';
import { createGazeButton } from './createInteractable.js';

export class Module1Balance {
  constructor(stereo, onComplete) {
    this.stereo = stereo;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.staircase = new Staircase1up1down({ start: 0.5, step: 0.05 });
    this.leftContrast = 0.5;
    this.rightContrast = 0.5;
    this._buildScene();
    this._buildUI();
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
        baseColor: { value: new THREE.Color(0x4f8cff) },
      },
    });
    const matRight = matLeft.clone();
    matRight.uniforms.eyePass.value = 2;

    const torusL = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 24, 48), matLeft);
    torusL.layers.set(LAYER_LEFT);
    torusL.position.set(-0.35, 0.15, -2);

    const boxR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matRight);
    boxR.layers.set(LAYER_RIGHT);
    boxR.position.set(0.35, -0.15, -2.2);

    const rodL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16), matLeft);
    rodL.layers.set(LAYER_LEFT);
    rodL.position.set(-0.5, -0.5, -1.6);

    const sphereR = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 16), matRight);
    sphereR.layers.set(LAYER_RIGHT);
    sphereR.position.set(0.55, 0.45, -1.8);

    this.materials = { left: matLeft, right: matRight };
    this.group.add(torusL, boxR, rodL, sphereR);
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
    this.ui.add(
      createGazeButton('Veo más el lado IZQUIERDO', new THREE.Vector3(-1.1, -0.85, -1.5), () =>
        this._trial(false)
      )
    );
    this.ui.add(
      createGazeButton('Veo más el lado DERECHO', new THREE.Vector3(1.1, -0.85, -1.5), () =>
        this._trial(true)
      )
    );
    this.ui.add(
      createGazeButton('Terminar módulo', new THREE.Vector3(0, -1.15, -1.5), () => this._finish())
    );
    this.group.add(this.ui);
  }

  _trial(reportRight) {
    const est = this.staircase.record(reportRight);
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
        'Indicio exploratorio de desequilibrio interocular en contraste (estilo Martín et al., 2020). IR≈1 sugiere equilibrio relativo; valores alejados de 1 merecen consulta profesional. No es diagnóstico.',
    });
  }

  mount() {
    this.stereo.addToScene(this.group);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    this.materials.left.dispose();
    this.materials.right.dispose();
  }

  getInteractables() {
    return this.ui.children;
  }

  onGazeSelect(mesh) {
    mesh.userData.onSelect?.();
  }

  /** Completa ensayos mínimos (Playwright / verificación automatizada). */
  completeForE2e() {
    this._trial(false);
    this._trial(true);
    this._trial(false);
    this._finish();
  }
}