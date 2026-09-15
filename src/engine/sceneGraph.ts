import type { Scene, Source } from '../types';
import type { RenderItem, FilterSpec } from './Compositor';
import type { UVRect } from './webgl-helpers';
import { getSourceMedia, consumeCanvasDirty, type SourceMedia } from './sourceMedia';
import { DEFAULT_FILTER_PARAMS } from './Compositor';

export interface SceneRenderContext {
  scene?: Scene;
  sources: Record<string, Source>;
  /** Override opacity per source id; return undefined to use default (1). */
  opacityFor?: (source: Source) => number | undefined;
}

function elementFromMedia(media: SourceMedia): { element: SourceMedia['element']; kind: SourceMedia['kind']; dirty: boolean } {
  if (media.kind === 'canvas') {
    return { element: media.element, kind: 'canvas', dirty: consumeCanvasDirty(media.element.id) };
  }
  return { element: media.element, kind: media.kind, dirty: false };
}

function naturalSize(media: SourceMedia): { width: number; height: number } {
  const el = media.element;
  if (el instanceof HTMLVideoElement) {
    return { width: el.videoWidth || 1, height: el.videoHeight || 1 };
  }
  return { width: el.width || 1, height: el.height || 1 };
}

function cropUv(source: Source, media: SourceMedia): UVRect | undefined {
  const { cropLeft, cropTop, cropRight, cropBottom } = source.transform;
  if (!cropLeft && !cropTop && !cropRight && !cropBottom) return undefined;
  const { width, height } = naturalSize(media);
  return {
    u0: cropLeft / width,
    v0: cropTop / height,
    u1: 1 - cropRight / width,
    v1: 1 - cropBottom / height,
  };
}

export function buildSceneItems(ctx: SceneRenderContext): RenderItem[] {
  if (!ctx.scene) return [];
  const items: RenderItem[] = [];

  for (const sourceId of ctx.scene.sourceIds) {
    const source = ctx.sources[sourceId];
    if (!source || !source.visible) continue;

    const media = getSourceMedia(sourceId);
    if (!media) continue;

    const { element, kind, dirty } = elementFromMedia(media);

    const filters: FilterSpec[] = source.filters
      .filter((f) => f.enabled)
      .map((f) => ({
        type: f.type,
        params: { ...DEFAULT_FILTER_PARAMS[f.type], ...f.params },
      }));

    const t = source.transform;
    const opacity = ctx.opacityFor?.(source);
    items.push({
      id: sourceId,
      element,
      kind,
      dirty,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      opacity: opacity ?? 1,
      rotation: t.rotation,
      mirrorX: t.flipX ?? false,
      uv: cropUv(source, media),
      filters,
    });
  }

  return items;
}

export function itemsSizedToCanvas(
  items: RenderItem[],
  _width: number,
  _height: number
): RenderItem[] {
  // Ensure zero/negative transformed sizes clamp to something drawable
  return items.map((item) => ({
    ...item,
    width: Math.max(1, item.width),
    height: Math.max(1, item.height),
  }));
}