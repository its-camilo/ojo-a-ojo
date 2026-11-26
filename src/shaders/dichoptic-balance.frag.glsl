#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vViewPos;
out vec4 fragColor;

uniform float contrastLeftLin;
uniform float contrastRightLin;
uniform int eyePass; // 1 = left layer only, 2 = right layer only (via camera layers)
uniform vec3 baseColor;

// INSERT_COLOR_OPS

void main() {
  vec3 n = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.3, 1.0, 0.2));
  float ndl = max(dot(n, lightDir), 0.0);
  vec3 linBase = srgb2lin(baseColor);
  float contrast = (eyePass == 1) ? contrastLeftLin : contrastRightLin;
  vec3 shaded = linBase * (0.25 + 0.75 * ndl) * contrast;
  fragColor = vec4(lin2srgb(shaded), 1.0);
}