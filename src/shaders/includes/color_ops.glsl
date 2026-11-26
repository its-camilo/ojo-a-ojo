// vcnotebook Color Ops — sRGB ↔ luz lineal (fragmentos insertados en shaders)

vec3 srgb2lin(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 lin2srgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float luminanceLin(vec3 linearRgb) {
  return dot(linearRgb, vec3(0.2126, 0.7152, 0.0722));
}