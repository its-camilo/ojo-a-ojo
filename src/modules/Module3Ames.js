import * as THREE from 'three';
import { createButtonRow } from './uiLayout.js';
import { clearGroup } from './clearGroup.js';
import { enableSharedStereoLayers } from '../rendering/stereoLayers.js';
import { buildCollineatedRoom, syncRoomWorldUniforms } from './amesBuild.js';
import { disposeObject3D } from '../rendering/sceneDispose.js';
import { recordModuleResult } from '../domain/sessionState.js';

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
    this._room = buildCollineatedRoom();
    this.group.add(this._room);

    this.ui = new THREE.Group();
    this._buildPromptButtons();
    enableSharedStereoLayers(this.ui);
    this.group.add(this.ui);

    this.stereo.setMono(this.phase === 'mono');
  }

  _roundTag() {
    return this.phase === 'mono' ? '1/2 Un ojo' : '2/2 Dos ojos';
  }

  _buildPromptButtons() {
    clearGroup(this.ui);
    const round = this._roundTag();
    createButtonRow([
      {
        label: `Izquierda\n(${round} · fig. roja)`,
        onSelect: () => this._answer('left'),
      },
      {
        label: `Derecha\n(${round} · fig. azul)`,
        onSelect: () => this._answer('right'),
      },
      {
        label: `Iguales\n(${round} · mismo tamaño)`,
        onSelect: () => this._answer('equal'),
      },
    ], { preset: 'ames' }).forEach((b) => this.ui.add(b));
  }

  _saveMonoPartial() {
    recordModuleResult('ames', {
      moduleId: 'ames',
      title: 'Cuarto de Ames 3D',
      monoJudgment: this.monoAnswer,
      stereoJudgment: null,
      partial: true,
      completedRounds: ['mono'],
    });
  }

  _answer(choice) {
    if (this.phase === 'mono') {
      this.monoAnswer = choice;
      this._saveMonoPartial();
      this.phase = 'stereo';
      this.stereo.setMono(false);
      this._buildPromptButtons();
    } else {
      this._finish(choice);
    }
  }

  _finish(stereoChoice) {
    const interpretation =
      'Cuarto con colineación proyectiva exacta (Ittelson, 1952; Sawada, 2024): desde la mirilla la habitación rectangular es matemáticamente coherente. Compare si la estereopsis atenúa la ilusión de escala.';

    this.onComplete({
      moduleId: 'ames',
      title: 'Cuarto de Ames 3D',
      monoJudgment: this.monoAnswer ?? stereoChoice,
      stereoJudgment: stereoChoice,
      partial: false,
      completedRounds: ['mono', 'stereo'],
      interpretation,
    });
  }

  mount() {
    this.stereo.scene.background = new THREE.Color(0xd8d0c8);
    this.stereo.scene.environment = null;
    this.stereo.renderer.toneMappingExposure = 1.12;
    this.stereo.addToScene(this.group);
    if (this._room) syncRoomWorldUniforms(this._room);
  }

  unmount() {
    this.stereo.removeFromScene(this.group);
    disposeObject3D(this.group);
    this.group = new THREE.Group();
    this._room = null;
    this.ui = null;
  }

  getInteractables() {
    return this.ui.children;
  }

  onGazeSelect(mesh) {
    mesh.userData.onSelect?.();
  }

  completeForE2e() {
    this._answer('right');
    this._finish('equal');
  }
}