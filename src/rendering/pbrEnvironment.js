import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Iluminación de estudio PBR (PMREM + RoomEnvironment) y sombras suaves.
 * @returns {{ dispose: () => void }}
 */
export function installStudioEnvironment(renderer, scene) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new RoomEnvironment();
  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;
  envScene.dispose?.();

  return {
    dispose() {
      envMap.dispose();
      pmrem.dispose();
    },
  };
}

export function addStudioLights(group, opts = {}) {
  const {
    key = 0xfff4e8,
    fill = 0xb8cce8,
    rim = 0x88b4ff,
    keyInt = 2.4,
    fillInt = 0.55,
    rimInt = 0.85,
    ambient = 0.22,
  } = opts;

  const keyLight = new THREE.DirectionalLight(key, keyInt);
  keyLight.position.set(2.2, 4.5, 3.8);
  keyLight.castShadow = true;
  const shadowSize = opts.shadowMapSize ?? (typeof window !== 'undefined' && navigator.maxTouchPoints > 0 ? 512 : 1024);
  keyLight.shadow.mapSize.set(shadowSize, shadowSize);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 24;
  keyLight.shadow.bias = -0.0004;

  const fillLight = new THREE.DirectionalLight(fill, fillInt);
  fillLight.position.set(-3.5, 1.2, 2.5);

  const rimLight = new THREE.DirectionalLight(rim, rimInt);
  rimLight.position.set(0.5, 2, -4);

  const amb = new THREE.AmbientLight(0xdde8f4, ambient);
  group.add(keyLight, fillLight, rimLight, amb);
  return { keyLight, fillLight, rimLight, amb };
}