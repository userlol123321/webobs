precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_progress;

void main() {
  // Fade to black and back is handled by crossfading two renders;
  // this shader simply fades the current frame based on progress.
  vec4 color = texture2D(u_texture, v_texCoord);
  gl_FragColor = vec4(color.rgb, color.a * u_progress);
}