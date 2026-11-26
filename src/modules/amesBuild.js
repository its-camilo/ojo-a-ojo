import * as THREE from 'three';
import amesVert from '../shaders/ames-surface.vert.glsl?raw';
import amesFrag from '../shaders/ames-surface.frag.glsl?raw';
import { prepareGlslForThree } from '../rendering/shaderBuild.js';
import {
  AMES_EYE,
  AMES_W,
  AMES_ROOM,
  collineateGeometryFromArch,
  collineateForward,
  meshFromArchPrimitive,
  archMatrixFromBox,
} from './amesCollineation.js';
import { enableSharedStereoLayers } from '../rendering/stereoLayers.js';

function makeSurfaceMaterial(surfaceType) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: prepareGlslForThree(amesVert),
    fragmentShader: prepareGlslForThree(amesFrag),
    uniforms: {
      surfaceType: { value: surfaceType },
      uEye: { value: AMES_EYE.clone() },
      uW: { value: AMES_W.clone() },
      uWainscotY: { value: AMES_ROOM.floorY + AMES_ROOM.wainscotH },
      uRoomWorld: { value: new THREE.Matrix4() },
    },
    side: THREE.DoubleSide,
  });
}

function syncRoomWorldUniforms(room) {
  room.updateMatrixWorld(true);
  room.traverse((obj) => {
    const u = obj.material?.uniforms?.uRoomWorld;
    if (u) u.value.copy(room.matrixWorld);
  });
}

/** Punto del piso en espacio físico (vértices ya colineados). */
function floorWorldAt(archX, archZ) {
  return collineateForward(new THREE.Vector3(archX, AMES_ROOM.floorY, archZ));
}

function shadowAtFoot(archX, archZ, radius) {
  const p = floorWorldAt(archX, archZ);
  const geo = new THREE.CircleGeometry(radius, 20);
  geo.applyMatrix4(
    new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(p.x, p.y + 0.005, p.z)
  );
  return new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 })
  );
}

function archQuadQuad(ax0, ay0, az0, ax1, ay1, az1, ax2, ay2, az2, ax3, ay3, az3) {
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    ax0, ay0, az0, ax1, ay1, az1, ax2, ay2, az2, ax3, ay3, az3,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  return collineateGeometryFromArch(geo, AMES_EYE, AMES_W);
}

function addQuad(room, ax0, ay0, az0, ax1, ay1, az1, ax2, ay2, az2, ax3, ay3, az3, material) {
  const mesh = new THREE.Mesh(archQuadQuad(ax0, ay0, az0, ax1, ay1, az1, ax2, ay2, az2, ax3, ay3, az3), material);
  room.add(mesh);
  return mesh;
}

function buildShell(room) {
  const { halfW, floorY, ceilY, zNear, zFar } = AMES_ROOM;
  const matFloor = makeSurfaceMaterial(0);
  const matWall = makeSurfaceMaterial(2);
  const matCeil = makeSurfaceMaterial(3);

  addQuad(
    room,
    -halfW, floorY, zNear,
    halfW, floorY, zNear,
    halfW, floorY, zFar,
    -halfW, floorY, zFar,
    matFloor
  );

  addQuad(
    room,
    -halfW, ceilY, zFar,
    halfW, ceilY, zFar,
    halfW, ceilY, zNear,
    -halfW, ceilY, zNear,
    matCeil
  );

  addQuad(room, -halfW, floorY, zNear, -halfW, ceilY, zNear, -halfW, ceilY, zFar, -halfW, floorY, zFar, matWall);
  addQuad(room, halfW, floorY, zFar, halfW, ceilY, zFar, halfW, ceilY, zNear, halfW, floorY, zNear, matWall);
  addQuad(room, -halfW, floorY, zFar, halfW, floorY, zFar, halfW, ceilY, zFar, -halfW, ceilY, zFar, matWall);
}

function buildBackWallDetails(room) {
  const { floorY, zFar } = AMES_ROOM;
  const zMullion = zFar + 0.08;
  const zPane = zFar + 0.11;
  const matWood = makeSurfaceMaterial(1);
  const matGlowPane = new THREE.MeshBasicMaterial({
    color: 0xe8f5ff,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const matFrame = new THREE.MeshLambertMaterial({ color: 0xede4d8, side: THREE.DoubleSide });

  const windows = [
    { x: -0.95, y: floorY + 1.35, w: 0.72, h: 0.88 },
    { x: 0.95, y: floorY + 1.35, w: 0.72, h: 0.88 },
  ];

  for (const win of windows) {
    const paneMat = matGlowPane.clone();
    const glowGeo = new THREE.PlaneGeometry(win.w * 0.9, win.h * 0.9);
    const glow = meshFromArchPrimitive(glowGeo, archMatrixFromBox(win.x, win.y, zPane, 1, 1, 1), paneMat);
    glow.renderOrder = 3;
    const trim = (dx, dy, dw, dh) =>
      meshFromArchPrimitive(
        new THREE.BoxGeometry(1, 1, 1),
        archMatrixFromBox(win.x + dx, win.y + dy, zMullion, dw, dh, 0.05),
        matWood
      );
    const tw = 0.06;
    const frames = [
      trim(0, win.h * 0.5 - tw * 0.5, win.w, tw),
      trim(0, -win.h * 0.5 + tw * 0.5, win.w, tw),
      trim(-win.w * 0.5 + tw * 0.5, 0, tw, win.h),
      trim(win.w * 0.5 - tw * 0.5, 0, tw, win.h),
    ];
    const mV = meshFromArchPrimitive(
      new THREE.BoxGeometry(1, 1, 1),
      archMatrixFromBox(win.x, win.y, zMullion, 0.04, win.h * 0.88, 0.06),
      matFrame
    );
    const mH = meshFromArchPrimitive(
      new THREE.BoxGeometry(1, 1, 1),
      archMatrixFromBox(win.x, win.y, zMullion, win.w * 0.88, 0.04, 0.06),
      matFrame
    );
    room.add(glow, ...frames, mV, mH);
  }

  const clockY = floorY + 1.55;
  const clockMatrix = new THREE.Matrix4()
    .makeRotationX(Math.PI / 2)
    .setPosition(0, clockY, zMullion + 0.04);
  const clock = meshFromArchPrimitive(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), clockMatrix, matFrame);
  const picture = meshFromArchPrimitive(
    new THREE.BoxGeometry(1, 1, 1),
    archMatrixFromBox(0, floorY + 0.95, zMullion + 0.03, 0.38, 0.48, 0.04),
    matWood
  );
  room.add(clock, picture);
}

function figureMaterial(color, rough = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 });
}

/**
 * Figura rígida ~1.55 m (métrica real): sin colineación en vértices; solo el anclaje del pie
 * en `floorWorldAt(archX, archZ)`.
 */
export function buildArchFigure(archX, archZ, palette, yaw = 0) {
  const fig = new THREE.Group();
  const foot = floorWorldAt(archX, archZ);
  fig.position.copy(foot);
  fig.rotation.y = yaw;

  const skin = figureMaterial(palette.skin);
  const cloth = figureMaterial(palette.cloth);
  const pants = figureMaterial(palette.pants);
  const shoe = figureMaterial(0x2c2824, 0.7);
  const hair = figureMaterial(0x3a2e24, 0.8);

  const part = (geo, x, y, z, mat) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    fig.add(mesh);
  };

  part(new THREE.BoxGeometry(0.24, 0.08, 0.34), 0, 0.04, 0.02, shoe);
  part(new THREE.BoxGeometry(0.22, 0.46, 0.2), 0, 0.31, 0, pants);
  part(new THREE.CylinderGeometry(0.105, 0.095, 0.34, 12), 0, 0.75, 0, pants);
  part(new THREE.CylinderGeometry(0.13, 0.12, 0.38, 14), 0, 1.06, 0, cloth);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), cloth);
  shoulders.scale.set(1.05, 0.45, 0.75);
  shoulders.position.set(0, 1.32, 0);
  fig.add(shoulders);

  part(new THREE.CylinderGeometry(0.055, 0.052, 0.28, 10), -0.17, 1.04, 0.02, cloth);
  part(new THREE.CylinderGeometry(0.048, 0.044, 0.26, 10), -0.19, 0.78, 0.02, cloth);
  part(new THREE.CylinderGeometry(0.055, 0.052, 0.28, 10), 0.17, 1.04, 0.02, cloth);
  part(new THREE.CylinderGeometry(0.048, 0.044, 0.26, 10), 0.19, 0.78, 0.02, cloth);

  part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), 0, 1.38, 0.01, skin);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 20), skin);
  head.scale.set(1, 1.08, 0.95);
  head.position.set(0, 1.52, 0.02);
  fig.add(head);
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair
  );
  hairMesh.position.set(0, 1.58, -0.02);
  fig.add(hairMesh);

  enableSharedStereoLayers(fig);
  return fig;
}

export function buildCollineatedRoom() {
  const room = new THREE.Group();
  buildShell(room);
  buildBackWallDetails(room);

  const archZ = -4.65;
  const nearArchX = -1.42;
  const farArchX = 1.42;

  const figNear = buildArchFigure(nearArchX, archZ, { skin: 0xe8b898, cloth: 0xc84a38, pants: 0x2c3e50 }, 0.35);
  const figFar = buildArchFigure(farArchX, archZ, { skin: 0xd8a888, cloth: 0x3a68a0, pants: 0x3a3428 }, -0.3);
  room.add(figNear, figFar);

  room.add(shadowAtFoot(nearArchX, archZ, 0.3), shadowAtFoot(farArchX, archZ, 0.22));

  const light = new THREE.PointLight(0xfff6ec, 2.8, 16);
  light.position.copy(collineateForward(new THREE.Vector3(0, AMES_ROOM.ceilY - 0.2, -2.2)));
  const sun = new THREE.DirectionalLight(0xfff8ee, 1.05);
  sun.position.set(0.8, 2.5, 0.5);
  room.add(
    light,
    sun,
    new THREE.AmbientLight(0xf6f0e8, 0.68),
    new THREE.HemisphereLight(0xfff8f0, 0x9a8c78, 0.48)
  );

  syncRoomWorldUniforms(room);
  enableSharedStereoLayers(room);
  return room;
}

export { syncRoomWorldUniforms };