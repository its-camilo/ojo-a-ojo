#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D mapLeft;
uniform sampler2D mapRight;
uniform float k1;
uniform float k2;
uniform int viewMode; // 0 side-by-side distorted, 1 side-by-side plain, 2 monocular left
uniform int layoutSplit; // 1 = half-half SBS

// INSERT_COLOR_OPS

vec2 brownConrady(vec2 uv, float signK) {
  vec2 p = uv * 2.0 - 1.0;
  float r2 = dot(p, p);
  float factor = 1.0 + signK * (k1 * r2 + k2 * r2 * r2);
  p *= factor;
  return p * 0.5 + 0.5;
}

vec4 sampleEye(sampler2D tex, vec2 uv, bool distort) {
  vec2 st = distort ? brownConrady(uv, 1.0) : uv;
  st = clamp(st, 0.001, 0.999);
  vec4 col = texture(tex, st);
  return col;
}

void main() {
  if (layoutSplit == 1) {
  if (vUv.x < 0.5) {
    vec2 uvEye = vec2(vUv.x * 2.0, vUv.y);
    bool distort = (viewMode == 0);
    vec4 L = sampleEye(mapLeft, uvEye, distort);
    if (viewMode == 2) {
      fragColor = vec4(lin2srgb(srgb2lin(L.rgb)), 1.0);
    } else {
      fragColor = L;
    }
  } else {
    vec2 uvEye = vec2((vUv.x - 0.5) * 2.0, vUv.y);
    bool distort = (viewMode == 0);
    vec4 R = sampleEye(mapRight, uvEye, distort);
    fragColor = R;
  }
  }
}