#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;

uniform int surfaceType;
uniform vec3 uEye;
uniform vec3 uW;
uniform float uWainscotY;

out vec4 fragColor;

vec3 archFromWorld(vec3 worldPos) {
  vec3 d = worldPos - uEye;
  float denom = max(0.15, 1.0 - dot(uW, d));
  return uEye + d / denom;
}

vec3 floorChecker(vec2 xz) {
  float tile = 0.55;
  vec2 c = xz / tile;
  vec2 f = fract(c);
  vec2 fw = max(fwidth(c), vec2(0.001));
  float bx = smoothstep(0.5 - fw.x * 0.65, 0.5 + fw.x * 0.65, f.x);
  float by = smoothstep(0.5 - fw.y * 0.65, 0.5 + fw.y * 0.65, f.y);
  float cell = mod(floor(c.x) + floor(c.y), 2.0);
  float ch = mix(cell, 1.0 - cell, bx * by + (1.0 - bx) * (1.0 - by) * 0.45);
  vec3 light = vec3(0.949, 0.925, 0.878);
  vec3 dark = vec3(0.173, 0.216, 0.282);
  float vein = sin(xz.x * 8.0) * sin(xz.y * 7.0) * 0.02;
  vec3 base = mix(light, dark, ch);
  float joint = smoothstep(0.46, 0.5, abs(fract(c.x) - 0.5) / (fw.x + 0.001));
  joint *= smoothstep(0.46, 0.5, abs(fract(c.y) - 0.5) / (fw.y + 0.001));
  base = mix(base * 0.9, base, max(joint, 0.92));
  return base + vein;
}

vec3 woodGrain(vec2 uv) {
  float grain = sin(uv.y * 26.0 + sin(uv.x * 3.5) * 1.8) * 0.035;
  return vec3(0.72, 0.6, 0.46) + grain;
}

vec3 wallPaper(vec2 uv) {
  float stripe = 0.5 + 0.5 * sin(uv.y * 18.0);
  return mix(vec3(0.961, 0.945, 0.910), vec3(0.92, 0.93, 0.88), stripe * 0.22);
}

void main() {
  vec3 X = archFromWorld(vWorldPos);
  vec3 n = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.3, 1.0, 0.22));
  float ndl = clamp(dot(n, lightDir), 0.0, 1.0);
  float shade = 0.48 + ndl * 0.54;

  float edgeX = 1.0 - min(abs(X.x) / 2.35, 1.0);
  float edgeZ = 1.0 - min(abs(X.z + 3.0) / 3.0, 1.0);
  vec3 cornerAo = vec3(0.84 + 0.16 * edgeX * edgeZ);

  vec3 albedo;
  if (surfaceType == 0) {
    albedo = floorChecker(X.xz);
  } else if (surfaceType == 1) {
    albedo = woodGrain(X.xz * vec2(0.32, 0.9));
  } else if (surfaceType == 2) {
    bool lower = X.y < uWainscotY;
    albedo = lower ? woodGrain(X.xz * vec2(0.28, 0.75)) : wallPaper(vec2(X.x, X.y));
    if (abs(X.y - uWainscotY) < 0.045) albedo = vec3(0.78, 0.72, 0.64);
    if (X.y > uWainscotY + 2.55) albedo = vec3(0.82, 0.78, 0.72);
  } else if (surfaceType == 3) {
    albedo = vec3(0.957, 0.941, 0.910);
  } else {
    albedo = vec3(0.92, 0.88, 0.72);
  }

  fragColor = vec4(albedo * shade * cornerAo, 1.0);
}