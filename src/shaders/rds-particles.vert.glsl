#version 300 es
precision highp float;

in vec3 position;

#ifdef USE_INSTANCING
in mat4 instanceMatrix;
#endif

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

out vec3 vWorld;
out float vSeed;

void main() {
#ifdef USE_INSTANCING
  vec4 world = instanceMatrix * vec4(position, 1.0);
#else
  vec4 world = vec4(position, 1.0);
#endif
  vWorld = world.xyz;
  vSeed = fract(sin(dot(world.xz, vec2(12.9898, 78.233))) * 43758.5453);
  vec4 mv = modelViewMatrix * world;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 5.0;
}