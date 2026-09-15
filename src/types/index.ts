/* ============================================================================
   WebOBS Core Type Definitions
   ============================================================================ */

export type SourceType = 'screen' | 'camera' | 'image' | 'text' | 'color' | 'group';
export type TransitionType = 'cut' | 'fade';
export type RecordingState = 'idle' | 'recording' | 'paused';
export type ResourceState = 'uninitialized' | 'activating' | 'active' | 'error';
export type VideoFilterType = 'chroma-key' | 'color-correction';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec4 {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  cropLeft: number;
  cropTop: number;
  cropRight: number;
  cropBottom: number;
}

export interface VideoFilter {
  id: string;
  type: VideoFilterType;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
}

export interface Source {
  id: string;
  type: SourceType;
  name: string;
  visible: boolean;
  locked: boolean;
  transform: Transform;
  filters: VideoFilter[];
  volume: number;
  muted: boolean;
  children?: string[];
}

export interface Scene {
  id: string;
  name: string;
  sourceIds: string[];
}

export interface Transition {
  type: TransitionType;
  duration: number;
}

export interface OutputSettings {
  resolution: { width: number; height: number };
  fps: number;
  format: 'webm' | 'mp4';
  videoBitrate: number;
  audioBitrate: number;
}

export interface SourceMetadata {
  type: SourceType;
  label: string;
  description: string;
  requiresUserGesture: boolean;
}

export const SOURCE_REGISTRY: SourceMetadata[] = [
  { type: 'screen', label: 'Display Capture', description: 'Captures your screen or browser tab', requiresUserGesture: true },
  { type: 'camera', label: 'Video Capture', description: 'Captures from a webcam or virtual camera', requiresUserGesture: false },
  { type: 'image', label: 'Image', description: 'Displays an image file', requiresUserGesture: false },
  { type: 'text', label: 'Text', description: 'Custom text overlay', requiresUserGesture: false },
  { type: 'color', label: 'Color', description: 'Solid color background', requiresUserGesture: false },
];

export const DEFAULT_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4K': { width: 3840, height: 2160 },
};