export type ShaderSource = string;

export function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertSource: string,
  fragSource: string
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSource);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${log}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

export interface ProgramUniforms {
  [name: string]: number | number[];
}

export function setUniform(gl: WebGLRenderingContext, loc: WebGLUniformLocation | null, value: number | number[]): void {
  if (loc === null) return;
  if (Array.isArray(value)) {
    switch (value.length) {
      case 2: gl.uniform2fv(loc, value); break;
      case 3: gl.uniform3fv(loc, value); break;
      case 4: gl.uniform4fv(loc, value); break;
      default: gl.uniform1fv(loc, Float32Array.from(value)); break;
    }
  } else {
    gl.uniform1f(loc, value);
  }
}

export function createTexture(gl: WebGLRenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Failed to create texture');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

export type TextureElement = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

export function uploadTexture(
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  element: TextureElement,
  flipY = true
): void {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
}

export interface VertexBuffer {
  buffer: WebGLBuffer;
  texCoordBuffer: WebGLBuffer;
}

export function createQuadBuffer(gl: WebGLRenderingContext): VertexBuffer {
  const positions = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
  const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const texCoordBuffer = gl.createBuffer();
  if (!texCoordBuffer) throw new Error('Failed to create buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  return { buffer, texCoordBuffer };
}

/**
 * Draw a quad for rect (x, y, width, height) in canvas pixel space.
 * (0,0) is top-left. Texture will be drawn upright when flipY is enabled on upload.
 */
export function drawQuad(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  buffers: VertexBuffer,
  texture: WebGLTexture,
  width: number,
  height: number,
  x: number,
  y: number,
  quadWidth: number,
  quadHeight: number,
  opacity = 1,
  uniforms: ProgramUniforms = {}
): void {
  gl.useProgram(program);

  const positions = new Float32Array([
    x, y,
    x + quadWidth, y,
    x, y + quadHeight,
    x + quadWidth, y + quadHeight,
  ]);

  const posLoc = gl.getAttribLocation(program, 'a_position');
  const texLoc = gl.getAttribLocation(program, 'a_texCoord');

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoordBuffer);
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

  const resLoc = gl.getUniformLocation(program, 'u_resolution');
  if (resLoc) gl.uniform2f(resLoc, width, height);

  const texLocUniform = gl.getUniformLocation(program, 'u_texture');
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (texLocUniform) gl.uniform1i(texLocUniform, 0);

  const opLoc = gl.getUniformLocation(program, 'u_opacity');
  if (opLoc) gl.uniform1f(opLoc, opacity);

  for (const [name, value] of Object.entries(uniforms)) {
    const uniformName = name.startsWith('u_') ? name : `u_${name}`;
    const loc = gl.getUniformLocation(program, uniformName);
    setUniform(gl, loc, value);
  }

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || (canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

export function createFramebufferTarget(gl: WebGLRenderingContext, width: number, height: number): {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
} {
  const texture = createTexture(gl);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Failed to create framebuffer');
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { framebuffer, texture };
}