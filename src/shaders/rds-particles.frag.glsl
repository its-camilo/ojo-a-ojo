#version 300 es
precision highp float;

in vec3 vWorld;
in float vSeed;
out vec4 fragColor;

// INSERT_COLOR_OPS

void main() {
  float gray = vSeed > 0.5 ? 0.92 : 0.08;
  vec3 lin = vec3(gray);
  fragColor = vec4(lin2srgb(lin), 1.0);
}