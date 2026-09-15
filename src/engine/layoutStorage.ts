import type {
  SourceType,
  TextOptions,
  Transform,
  TransitionType,
  VideoFilter,
} from '../types';
import { useSceneStore } from '../stores/sceneStore';
import { useSettingsStore } from '../stores/settingsStore';

const STORAGE_KEY = 'webobs.layout.v1';

export interface SavedSource {
  type: SourceType;
  name: string;
  visible: boolean;
  locked: boolean;
  transform: Transform;
  filters: VideoFilter[];
  textOptions?: TextOptions;
  color?: string;
}

export interface SavedLayout {
  version: 1;
  sceneName: string;
  sources: SavedSource[];
  settings: {
    resolution: { width: number; height: number };
    fps: number;
    format: 'webm' | 'mp4';
    videoBitrate: number;
    audioBitrate: number;
    transitionType: TransitionType;
    transitionDuration: number;
  };
}

export function captureLayout(): SavedLayout | null {
  const store = useSceneStore.getState();
  const scene = store.scenes[0];
  if (!scene) return null;
  const settings = useSettingsStore.getState();
  const sources = scene.sourceIds
    .map((id) => store.sources[id])
    .filter((s) => s !== undefined)
    .map(({ id: _id, volume: _vol, muted: _mut, children: _ch, ...rest }) => {
      void _id;
      void _vol;
      void _mut;
      void _ch;
      return rest as SavedSource;
    });
  if (sources.length === 0) return null;
  return {
    version: 1,
    sceneName: scene.name,
    sources,
    settings: {
      resolution: settings.output.resolution,
      fps: settings.output.fps,
      format: settings.output.format,
      videoBitrate: settings.output.videoBitrate,
      audioBitrate: settings.output.audioBitrate,
      transitionType: settings.transitionType,
      transitionDuration: settings.transitionDuration,
    },
  };
}

export function saveLayout(): void {
  const layout = captureLayout();
  if (!layout) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage unavailable (private mode / quota) — ignore.
  }
}

export function loadLayout(): SavedLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedLayout;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sources)) return null;
    return parsed;
  } catch {
    return null;
  }
}