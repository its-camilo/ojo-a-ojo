import * as THREE from 'three';
import { createGazeButton } from './createInteractable.js';
import { clearGroup } from './clearGroup.js';

export class Module3Ames {
  constructor(stereo, monoRound, onComplete) {
    this.stereo = stereo;
    this.onComplete = onComplete;
    this.group = new THREE.Group();
    this.phase = 'mono';
    this.answer = null;
    this._buildRoom();
  }

  _buildRoom() {
    const room = new THREE.Group();
    const w = 4;
    const h = 2.4;
    const dNear = 2;
    const dFar = 5;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x5c4a3a, roughness: 0.95 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, dFar + dNear), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -h / 2, -(dFar - dNear) / 2 - 1);
    room.add(floor);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(dFar + dNear, h), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-w / 2, 0, -2);
    room.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(dFar + dNear, h), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(w / 2, 0, -2);
    room.add(rightWall);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    back.position.set(0, 0, -dFar);
    room.add(back);

    const figGeo = new THREE.CapsuleGeometry(0.22, 0.5, 8, 16);
    const figMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee });
    const figA = new THREE.Mesh(figGeo, figMat);
    figA.position.set(-0.9, -0.55, -1.2);
    const figB = new THREE.Mesh(figGeo, figMat.clone());
    figB.position.set(1.1, -0.55, -3.6);
    figB.scale.setScalar(1.85);
    room.add(figA, figB);
    this.figA = figA;
    this.figB = figB;

    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(0, 4, 2);
    room.add(light);
    room.add(new THREE.AmbientLight(0x607090, 0.4));

    this.group.add(room);

    this.ui = new THREE.Group();
    const pl = this.phase === 'mono' ? 'MONOCULAR' : 'ESTÉREO';
    this.ui.add(
      createGazeButton(`${pl}: figura IZQUIERDA más grande`, new THREE.Vector3(-1.2, -0.9, -1.2), () =>
        this._answer('left')
      )
    );
    this.ui.add(
      createGazeButton(`${pl}: figura DERECHA más grande`, new THREE.Vector3(1.2, -0.9, -1.2), () =>
        this._answer('right')
      )
    );
    this.ui.add(
      createGazeButton(`${pl}: se ven IGUALES`, new THREE.Vector3(0, -1.05, -1.2), () => this._answer('equal'))
    );
    this.group.add(this.ui);

    this.stereo.setMono(this.phase === 'mono');
  }

  _answer(choice) {
    if (this.phase === 'mono') {
      this.monoAnswer = choice;
      this.phase = 'stereo';
      this.stereo.setMono(false);
      clearGroup(this.ui);
      this.ui.add(
        createGazeButton('ESTÉREO: figura IZQUIERDA más grande', new THREE.Vector3(-1.2, -0.9, -1.2), () =>
          this._finish('left')
        )
      );
      this.ui.add(
        createGazeButton('ESTÉREO: figura DERECHA más grande', new THREE.Vector3(1.2, -0.9, -1.2), () =>
          this._finish('right')
        )
      );
      this.ui.add(
        createGazeButton('ESTÉREO: se ven IGUALES', new THREE.Vector3(0, -1.05, -1.2), () => this._finish('equal'))
      );
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
}