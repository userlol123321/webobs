import type { TextureElement } from '../engine/webgl-helpers';

export type SourceMediaKind = 'video' | 'image' | 'canvas';

export interface SourceMedia {
  element: TextureElement;
  kind: SourceMediaKind;
  /** MediaStream associated with the source (e.g. display/camera/mic). */
  stream?: MediaStream;
  /** Natural/intrinsic width of the media. */
  width: number;
  /** Natural/intrinsic height of the media. */
  height: number;
}

const registry = new Map<string, SourceMedia>();

/** Tracks canvases (text/color sources) that were re-rendered and need re-upload. */
const dirtyCanvasIds = new Set<string>();

export function markCanvasDirty(id: string): void {
  dirtyCanvasIds.add(id);
}

export function consumeCanvasDirty(id: string): boolean {
  return dirtyCanvasIds.delete(id);
}

export function registerSourceMedia(id: string, media: SourceMedia): void {
  registry.set(id, media);
}

export function getSourceMedia(id: string): SourceMedia | undefined {
  return registry.get(id);
}

export function removeSourceMedia(id: string): void {
  const media = registry.get(id);
  if (media && media.stream) {
    media.stream.getTracks().forEach((t) => t.stop());
  }
  registry.delete(id);
}

export function hasSourceMedia(id: string): boolean {
  return registry.has(id);
}

export function clearSourceMedia(): void {
  registry.forEach((media) => {
    if (media.stream) media.stream.getTracks().forEach((t) => t.stop());
  });
  registry.clear();
}

/** Create a hidden video element that plays a MediaStream and keep it muted (analysed via Web Audio separately). */
export function createVideoElementForStream(stream: MediaStream): HTMLVideoElement {
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.style.position = 'absolute';
  video.style.left = '-10000px';
  video.style.width = '1px';
  video.style.height = '1px';
  video.setAttribute('playsinline', '');
  document.body.appendChild(video);
  video.srcObject = stream;
  video.play().catch(() => void 0);
  return video;
}

export function removeVideoElement(video: HTMLVideoElement): void {
  video.pause();
  video.srcObject = null;
  if (video.parentElement) video.parentElement.removeChild(video);
}