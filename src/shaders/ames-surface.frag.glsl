#version 300 es
precision highp float;

in vec3 vArch;
in vec3 vNormal;

uniform int surfaceType;
uniform vec3 uRoomFloorY;
uniform float uWainscotY;

out vec4 fragColor;

float aastep(float edge, float x, float w) {
  return smoothstep(edge - w, edge + w, x);
}

vec3 marbleTone(vec2 uv, vec3 light, vec3 dark) {
  float scale = 0.42;
  vec2 c = uv / scale;
  vec2 f = fract(c);
  vec2 fw = max(fwidth(c), vec2(0.001));
  float bx = smoothstep(0.5 - fw.x * 0.6, 0.5 + fw.x * 0.6, f.x);
  float by = smoothstep(0.5 - fw.y * 0.6, 0.5 + fw.y * 0.6, f.y);
  float cell = mod(floor(c.x) + floor(c.y), 2.0);
  float ch = mix(cell, 1.0 - cell, bx * by + (1.0 - bx) * (1.0 - by) * 0.5);
  float n = sin(uv.x * 11.0) * sin(uv.y * 9.0) * 0.035;
  vec3 base = mix(light, dark, ch);
  return base + n;
}

vec3 woodGrain(vec2 uv) {
  float grain = sin(uv.y * 28.0 + sin(uv.x * 4.0) * 2.0) * 0.04;
  return vec3(0.58, 0.45, 0.34) + grain + vec3(0.06, 0.04, 0.02) * sin(uv.x * 3.0);
}

vec3 wallPaper(vec2 uv) {
  float stripe = 0.5 + 0.5 * sin(uv.y * 22.0);
  vec3 base = mix(vec3(0.93, 0.91, 0.86), vec3(0.88, 0.92, 0.86), stripe * 0.35);
  return base;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.35, 1.0, 0.25));
  float ndl = clamp(dot(n, lightDir), 0.0, 1.0);
  float amb = 0.38;
  float shade = amb + ndl * 0.62;

  vec3 cornerAo = vec3(1.0);
  float edgeX = min(abs(vArch.x), 2.3) / 2.3;
  float edgeZ = min(abs(vArch.z + 3.0), 3.0) / 3.0;
  cornerAo = vec3(0.82 + 0.18 * edgeX * edgeZ);

  vec3 albedo;
  if (surfaceType == 0) {
    albedo = marbleTone(vArch.xz, vec3(0.88, 0.84, 0.76), vec3(0.34, 0.33, 0.32));
  } else if (surfaceType == 1) {
    albedo = woodGrain(vArch.xz * vec2(0.35, 1.2));
  } else if (surfaceType == 2) {
    float lower = vArch.y < uWainscotY ? 1.0 : 0.0;
    albedo = mix(wallPaper(vec2(vArch.x, vArch.y) * 0.6), woodGrain(vArch.xz), lower);
    if (vArch.y > uWainscotY - 0.04 && vArch.y < uWainscotY + 0.04) {
      albedo = vec3(0.72, 0.66, 0.58);
    }
    if (vArch.y > uWainscotY + 2.75) {
      albedo = vec3(0.78, 0.72, 0.64);
    }
  } else if (surfaceType == 3) {
    albedo = mix(vec3(0.94, 0.9, 0.84), vec3(0.86, 0.82, 0.76), 0.35);
  } else {
    albedo = vec3(0.95, 0.88, 0.72);
  }

  vec3 col = albedo * shade * cornerAo;
  fragColor = vec4(col, 1.0);
}