attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;

varying vec2 v_texCoord;

void main() {
  vec2 clip = a_position / u_resolution * 2.0 - 1.0;
  // Flip Y so canvas space (0,0) is top-left
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_texCoord = a_texCoord;
}