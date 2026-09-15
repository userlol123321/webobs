precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_texture;

uniform float u_keyR;
uniform float u_keyG;
uniform float u_keyB;
uniform float u_similarity;
uniform float u_smoothness;
uniform float u_spill;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec3 key = vec3(u_keyR, u_keyG, u_keyB);
  vec3 diff = color.rgb - key;
  float dist = length(diff);

  float alpha = max(dist - u_similarity, 0.0) / max(u_smoothness, 0.001);
  alpha = clamp(alpha, 0.0, 1.0);

  // Spill suppression: reduce color bleeding from the key color
  float spill = clamp((u_similarity + u_smoothness) - dist, 0.0, 1.0) * u_spill;
  color.rgb = color.rgb - key * spill;

  gl_FragColor = vec4(color.rgb, color.a * alpha);
}