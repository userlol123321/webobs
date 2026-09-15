import passthroughVert from './shaders/passthrough.vert?raw';
import compositeFrag from './shaders/composite.frag?raw';
import chromaKeyFrag from './shaders/chroma-key.frag?raw';
import colorCorrectionFrag from './shaders/color-correction.frag?raw';
import {
  createProgram,
  createQuadBuffer,
  createTexture,
  createFramebufferTarget,
  uploadTexture,
  drawQuad,
  type TextureElement,
  type VertexBuffer,
  type UVRect,
} from './webgl-helpers';
import type { VideoFilterType } from '../types';

export interface FilterSpec {
  type: VideoFilterType;
  params: Record<string, number>;
}

export interface RenderItem {
  id: string;
  element: TextureElement;
  kind: 'video' | 'image' | 'canvas';
  dirty?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  rotation?: number;
  uv?: UVRect;
  filters?: FilterSpec[];
}

export const DEFAULT_FILTER_PARAMS: Record<VideoFilterType, Record<string, number>> = {
  'chroma-key': { keyR: 0, keyG: 1, keyB: 0, similarity: 0.4, smoothness: 0.08, spill: 0.1 },
  'color-correction': { brightness: 0, contrast: 1, saturation: 1, gamma: 1, degrees: 0 },
};

export class Compositor {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private compositeProgram: WebGLProgram | null = null;
  private filterPrograms: Partial<Record<VideoFilterType, WebGLProgram>> = {};
  private buffers: VertexBuffer | null = null;
  private textures = new Map<string, WebGLTexture>();
  private fboA: { framebuffer: WebGLFramebuffer; texture: WebGLTexture } | null = null;
  private fboB: { framebuffer: WebGLFramebuffer; texture: WebGLTexture } | null = null;
  private recordCanvas: HTMLCanvasElement;
  private recordCtx: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.recordCanvas = document.createElement('canvas');
    this.recordCtx = this.recordCanvas.getContext('2d');
  }

  init(width: number, height: number): void {
    const gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: true,
    });
    if (!gl) {
      throw new Error('WebGL is not supported in this browser');
    }
    this.gl = gl;

    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);

    this.compositeProgram = createProgram(gl, passthroughVert, compositeFrag);
    this.filterPrograms['chroma-key'] = createProgram(gl, passthroughVert, chromaKeyFrag);
    this.filterPrograms['color-correction'] = createProgram(gl, passthroughVert, colorCorrectionFrag);
    this.buffers = createQuadBuffer(gl);

    this.fboA = createFramebufferTarget(gl, width, height);
    this.fboB = createFramebufferTarget(gl, width, height);
    this.recordCanvas.width = width;
    this.recordCanvas.height = height;

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  setResolution(width: number, height: number): void {
    const gl = this.gl;
    if (!gl || !this.fboA || !this.fboB) return;
    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);
    this.fboA = createFramebufferTarget(gl, width, height);
    this.fboB = createFramebufferTarget(gl, width, height);
    this.recordCanvas.width = width;
    this.recordCanvas.height = height;
  }

  registerTexture(id: string): boolean {
    if (!this.gl) return false;
    if (this.textures.has(id)) return true;
    const texture = createTexture(this.gl);
    this.textures.set(id, texture);
    return true;
  }

  unregisterTexture(id: string): void {
    if (!this.gl) return;
    const texture = this.textures.get(id);
    if (texture) {
      this.gl.deleteTexture(texture);
      this.textures.delete(id);
    }
  }

  getStream(fps = 30): MediaStream {
    return this.recordCanvas.captureStream(fps);
  }

  render(items: RenderItem[]): void {
    const gl = this.gl;
    if (!gl || !this.compositeProgram || !this.buffers || !this.fboA || !this.fboB) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);

    for (const item of items) {
      let texture = this.textures.get(item.id);
      if (!texture) {
        this.registerTexture(item.id);
        texture = this.textures.get(item.id);
      }
      if (!texture) continue;

      const shouldUpload =
        item.kind === 'video' || item.kind === 'image' || item.kind === 'canvas' && item.dirty;
      if (shouldUpload) {
        uploadTexture(gl, texture, item.element);
      }

      const sourceTexture = this.applyFilters(item, texture, width, height);
      if (!sourceTexture) continue;

      drawQuad(
        gl,
        this.compositeProgram,
        this.buffers,
        sourceTexture.texture,
        width,
        height,
        item.x,
        item.y,
        item.width,
        item.height,
        item.opacity ?? 1,
        {},
        sourceTexture.flipped,
        item.rotation ?? 0,
        item.uv
      );
    }

    // Copy WebGL framebuffer to 2D recording canvas so captureStream()
    // gets correctly-oriented pixels (GL stores row-0 at the bottom).
    if (this.recordCtx) {
      this.recordCtx.clearRect(0, 0, width, height);
      this.recordCtx.drawImage(this.canvas, 0, 0);
    }
  }

  private applyFilters(
    item: RenderItem,
    source: WebGLTexture,
    width: number,
    height: number
  ): { texture: WebGLTexture; flipped: boolean } | null {
    const gl = this.gl;
    if (!gl || !this.fboA || !this.fboB) return null;

    const filters = (item.filters ?? []).filter((f) => f.type === 'chroma-key' || f.type === 'color-correction');
    if (filters.length === 0) return { texture: source, flipped: false };

    let current = source;
    let writeFbo = this.fboA;

    filters.forEach((filter, index) => {
      const program = this.filterPrograms[filter.type];
      if (!program) return;

      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo.framebuffer);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const params = { ...DEFAULT_FILTER_PARAMS[filter.type], ...filter.params };
      drawQuad(gl, program, this.buffers!, current, width, height, 0, 0, width, height, 1, params, index > 0, 0);

      current = writeFbo.texture;
      writeFbo = index % 2 === 0 ? this.fboB! : this.fboA!;
    });

    // Restore target framebuffer & viewport
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    return { texture: current, flipped: true };
  }

  dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.compositeProgram) gl.deleteProgram(this.compositeProgram);
    for (const name of Object.keys(this.filterPrograms) as VideoFilterType[]) {
      const p = this.filterPrograms[name];
      if (p) gl.deleteProgram(p);
    }
    this.textures.forEach((t) => gl.deleteTexture(t));
    this.textures.clear();
    if (this.buffers) {
      gl.deleteBuffer(this.buffers.buffer);
      gl.deleteBuffer(this.buffers.texCoordBuffer);
    }
    if (this.fboA) {
      gl.deleteFramebuffer(this.fboA.framebuffer);
      gl.deleteTexture(this.fboA.texture);
    }
    if (this.fboB) {
      gl.deleteFramebuffer(this.fboB.framebuffer);
      gl.deleteTexture(this.fboB.texture);
    }
    this.recordCtx = null;
    this.recordCanvas.width = 0;
    this.recordCanvas.height = 0;
    this.gl = null;
  }
}