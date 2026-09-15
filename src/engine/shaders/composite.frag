precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_opacity;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  gl_FragColor = vec4(color.rgb, color.a * u_opacity);
}