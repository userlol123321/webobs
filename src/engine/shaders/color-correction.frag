precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_texture;

uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_gamma;
uniform float u_degrees;

vec3 rgb_to_hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv_to_rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);

  // Hue rotation (degrees)
  vec3 hsv = rgb_to_hsv(color.rgb);
  hsv.x = fract(hsv.x + u_degrees / 360.0);
  color.rgb = hsv_to_rgb(hsv);

  // Saturation
  float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  color.rgb = mix(vec3(luma), color.rgb, u_saturation);

  // Brightness (offset) and contrast
  color.rgb = color.rgb * u_contrast + u_brightness;

  // Gamma
  color.rgb = pow(clamp(color.rgb, 0.0, 1.0), vec3(1.0 / max(u_gamma, 0.001)));

  gl_FragColor = vec4(color.rgb, color.a);
}