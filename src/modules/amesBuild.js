import * as THREE from 'three';
import amesVert from '../shaders/ames-surface.vert.glsl?raw';
import amesFrag from '../shaders/ames-surface.frag.glsl?raw';
import { prepareGlslForThree } from '../utils/shaderBuild.js';
import {
  AMES_EYE,
  AMES_W,
  AMES_ROOM,
  collineateGeometryFromArch,
  collineateForward,
  meshFromArchPrimitive,
  archMatrixFromBox,
} from '../utils/amesCollineation.js';
import { enableSharedStereoLayers } from '../utils/stereoLayers.js';

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
  const geo = new THREE.CircleGeometry(radius, 28);
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
  const matWood = makeSurfaceMaterial(1);
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

  const railY = floorY + AMES_ROOM.wainscotH;
  const crownY = ceilY - 0.08;
  const roomDepth = Math.abs(zFar - zNear) + 0.08;
  room.add(
    meshFromArchPrimitive(
      new THREE.BoxGeometry(1, 1, 1),
      archMatrixFromBox(0, floorY + 0.03, (zNear + zFar) * 0.5, AMES_ROOM.width + 0.06, 0.05, roomDepth),
      matWood
    )
  );
  room.add(
    meshFromArchPrimitive(
      new THREE.BoxGeometry(1, 1, 1),
      archMatrixFromBox(0, railY, (zNear + zFar) * 0.5, AMES_ROOM.width, 0.05, roomDepth),
      matWood
    )
  );
  room.add(
    meshFromArchPrimitive(
      new THREE.BoxGeometry(1, 1, 1),
      archMatrixFromBox(0, crownY, (zNear + zFar) * 0.5, AMES_ROOM.width, 0.07, roomDepth + 0.02),
      matWood
    )
  );
}

function buildBackWallDetails(room) {
  const { halfW, floorY, ceilY, zFar } = AMES_ROOM;
  const z = zFar + 0.02;
  const matWood = makeSurfaceMaterial(1);
  const matGlow = new THREE.MeshBasicMaterial({ color: 0xfff6e8 });
  const matGlowPane = new THREE.MeshBasicMaterial({ color: 0xdceeff });
  const matFrame = new THREE.MeshLambertMaterial({ color: 0xede4d8 });

  const windows = [
    { x: -0.95, y: floorY + 1.35, w: 0.72, h: 0.88 },
    { x: 0.95, y: floorY + 1.35, w: 0.72, h: 0.88 },
  ];

  for (const win of windows) {
    const glowGeo = new THREE.PlaneGeometry(win.w * 0.88, win.h * 0.88);
    const glow = meshFromArchPrimitive(glowGeo, archMatrixFromBox(win.x, win.y, z - 0.01, 1, 1, 1), matGlowPane);
    const glowWarm = meshFromArchPrimitive(
      new THREE.PlaneGeometry(win.w * 0.5, win.h * 0.5),
      archMatrixFromBox(win.x + win.w * 0.12, win.y + win.h * 0.08, z - 0.008, 1, 1, 1),
      matGlow
    );
    const frame = meshFromArchPrimitive(
      new THREE.BoxGeometry(1, 1, 1),
      archMatrixFromBox(win.x, win.y, z + 0.02, win.w, win.h, 0.06),
      matWood
    );
    const mV = meshFromArchPrimitive(
      new THREE.BoxGeometry(1, 1, 1),
      archMatrixFromBox(win.x, win.y, z + 0.03, 0.04, win.h * 0.9, 0.07),
      matFrame
    );
    const mH = meshFromArchPrimitive(
      new THREE.BoxGeometry(1, 1, 1),
      archMatrixFromBox(win.x, win.y, z + 0.03, win.w * 0.9, 0.04, 0.07),
      matFrame
    );
    room.add(glow, glowWarm, frame, mV, mH);
  }

  const clockY = floorY + 1.55;
  const clockMatrix = new THREE.Matrix4()
    .makeRotationX(Math.PI / 2)
    .setPosition(0, clockY, z + 0.04);
  const clock = meshFromArchPrimitive(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 32), clockMatrix, matFrame);
  const picture = meshFromArchPrimitive(
    new THREE.BoxGeometry(1, 1, 1),
    archMatrixFromBox(0, floorY + 0.95, z + 0.03, 0.38, 0.48, 0.04),
    matWood
  );
  room.add(clock, picture);
}

function figureMaterial(color, rough = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 });
}

function meshPart(geo, matrix, mat) {
  const g = geo.clone();
  g.applyMatrix4(matrix);
  collineateGeometryFromArch(g, AMES_EYE, AMES_W);
  return new THREE.Mesh(g, mat);
}

/**
 * Figura humana ~1.55 m con uniones sólidas (pies en floorY del punto dado).
 */
export function buildArchFigure(footX, footZ, palette, yaw = 0) {
  const fig = new THREE.Group();
  const skin = figureMaterial(palette.skin);
  const cloth = figureMaterial(palette.cloth);
  const pants = figureMaterial(palette.pants);
  const shoe = figureMaterial(0x2c2824, 0.7);
  const hair = figureMaterial(0x3a2e24, 0.8);

  const root = new THREE.Matrix4().makeRotationY(yaw).setPosition(footX, AMES_ROOM.floorY, footZ);

  const parts = [];
  const add = (geo, local, mat) => {
    const m = new THREE.Matrix4().multiplyMatrices(root, local);
    parts.push(meshPart(geo, m, mat));
  };

  add(new THREE.BoxGeometry(0.24, 0.08, 0.34), new THREE.Matrix4().makeTranslation(0, 0.04, 0.02), shoe);
  add(new THREE.BoxGeometry(0.22, 0.46, 0.2), new THREE.Matrix4().makeTranslation(0, 0.31, 0), pants);
  add(new THREE.CylinderGeometry(0.105, 0.095, 0.34, 16), new THREE.Matrix4().makeTranslation(0, 0.75, 0), pants);
  add(new THREE.CylinderGeometry(0.13, 0.12, 0.38, 18), new THREE.Matrix4().makeTranslation(0, 1.06, 0), cloth);
  add(new THREE.SphereGeometry(0.15, 20, 16), new THREE.Matrix4().makeTranslation(0, 1.32, 0).multiply(new THREE.Matrix4().makeScale(1.05, 0.45, 0.75)), cloth);

  const armL = new THREE.Matrix4().makeTranslation(-0.17, 1.18, 0.02);
  add(new THREE.CylinderGeometry(0.055, 0.052, 0.28, 12), armL, cloth);
  add(
    new THREE.CylinderGeometry(0.048, 0.044, 0.26, 12),
    new THREE.Matrix4().multiplyMatrices(armL, new THREE.Matrix4().makeTranslation(-0.02, -0.26, 0)),
    cloth
  );
  const armR = new THREE.Matrix4().makeTranslation(0.17, 1.18, 0.02);
  add(new THREE.CylinderGeometry(0.055, 0.052, 0.28, 12), armR, cloth);
  add(
    new THREE.CylinderGeometry(0.048, 0.044, 0.26, 12),
    new THREE.Matrix4().multiplyMatrices(armR, new THREE.Matrix4().makeTranslation(0.02, -0.26, 0)),
    cloth
  );

  add(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 14), new THREE.Matrix4().makeTranslation(0, 1.38, 0.01), skin);
  add(new THREE.SphereGeometry(0.11, 22, 18), new THREE.Matrix4().makeTranslation(0, 1.52, 0.02).multiply(new THREE.Matrix4().makeScale(1, 1.08, 0.95)), skin);
  add(new THREE.SphereGeometry(0.115, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.Matrix4().makeTranslation(0, 1.58, -0.02), hair);

  parts.forEach((p) => fig.add(p));
  enableSharedStereoLayers(fig);
  return fig;
}

export function buildCollineatedRoom() {
  const room = new THREE.Group();
  buildShell(room);
  buildBackWallDetails(room);

  const nearArchX = -1.42;
  const nearArchZ = -1.05;
  const farArchX = 1.55;
  const farArchZ = -4.85;

  const figNear = buildArchFigure(nearArchX, nearArchZ, { skin: 0xe8b898, cloth: 0xc84a38, pants: 0x2c3e50 }, 0.38);
  const figFar = buildArchFigure(farArchX, farArchZ, { skin: 0xd8a888, cloth: 0x3a68a0, pants: 0x3a3428 }, -0.32);
  room.add(figNear, figFar);

  room.add(shadowAtFoot(nearArchX, nearArchZ, 0.3), shadowAtFoot(farArchX, farArchZ, 0.22));

  const light = new THREE.PointLight(0xfff2e0, 2.4, 14);
  light.position.copy(collineateForward(new THREE.Vector3(0, AMES_ROOM.ceilY - 0.2, -2.2)));
  const sun = new THREE.DirectionalLight(0xfff8ee, 0.85);
  sun.position.set(0.8, 2.5, 0.5);
  room.add(
    light,
    sun,
    new THREE.AmbientLight(0xf4ece0, 0.55),
    new THREE.HemisphereLight(0xfff8f0, 0x8a7c68, 0.42)
  );

  room.scale.setScalar(0.9);
  room.position.set(0, 0.04, -0.12);
  syncRoomWorldUniforms(room);
  enableSharedStereoLayers(room);
  return room;
}

export { syncRoomWorldUniforms };