import type { VideoFilter, VideoFilterType } from '../types';

export interface FilterParamMeta {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  /** Render as a color swatch (0..1 r/g/b components). */
  color?: boolean;
}

export interface FilterMeta {
  type: VideoFilterType;
  label: string;
  params: FilterParamMeta[];
}

export const FILTER_REGISTRY: FilterMeta[] = [
  {
    type: 'chroma-key',
    label: 'Chroma Key',
    params: [
      { key: 'keyR', label: 'Key Color', min: 0, max: 1, step: 0.01, color: true },
      { key: 'keyG', label: 'Green', min: 0, max: 1, step: 0.01, color: true },
      { key: 'keyB', label: 'Blue', min: 0, max: 1, step: 0.01, color: true },
      { key: 'similarity', label: 'Similarity', min: 0, max: 1, step: 0.01 },
      { key: 'smoothness', label: 'Smoothness', min: 0, max: 0.5, step: 0.01 },
      { key: 'spill', label: 'Spill Reduction', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'color-correction',
    label: 'Color Correction',
    params: [
      { key: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.01 },
      { key: 'contrast', label: 'Contrast', min: 0, max: 4, step: 0.01 },
      { key: 'saturation', label: 'Saturation', min: 0, max: 4, step: 0.01 },
      { key: 'gamma', label: 'Gamma', min: 0.1, max: 4, step: 0.01 },
      { key: 'degrees', label: 'Hue Shift', min: -180, max: 180, step: 1 },
    ],
  },
];

export function getFilterMeta(type: VideoFilterType): FilterMeta | undefined {
  return FILTER_REGISTRY.find((f) => f.type === type);
}

let filterCounter = 0;

export function createFilter(type: VideoFilterType): VideoFilter {
  filterCounter++;
  const meta = getFilterMeta(type);
  return {
    id: `filter_${Date.now().toString(36)}_${filterCounter}`,
    type,
    name: meta?.label ?? 'Filter',
    enabled: true,
    params: {},
  };
}