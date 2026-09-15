import type { Source, SourceType, Transform } from '../../types';
import { generateId } from '../../utils/generate-id';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAudioStore } from '../../stores/audioStore';
import { getAudioMixer } from '../audio/AudioMixer';
import { registerSourceMedia, createVideoElementForStream } from '../sourceMedia';
import {
  createColorCanvas,
  createImageCanvas,
  createTextCanvas,
  DEFAULT_TEXT_OPTIONS,
  type TextSourceOptions,
} from './factory';

export interface SourceCreationOptions {
  text?: TextSourceOptions;
  color?: string;
}

function fullRect(): Transform {
  const { canvasWidth, canvasHeight } = useSettingsStore.getState();
  return {
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
    rotation: 0,
    cropLeft: 0,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0,
  };
}

function cornerOverlayRect(fraction = 0.3): Transform {
  const { canvasWidth, canvasHeight } = useSettingsStore.getState();
  const w = Math.round(canvasWidth * fraction);
  const h = Math.round((w * 720) / 1280);
  const margin = 24;
  return {
    x: canvasWidth - w - margin,
    y: canvasHeight - h - margin,
    width: w,
    height: h,
    rotation: 0,
    cropLeft: 0,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0,
  };
}

async function requestCamera(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch {
    return null;
  }
}

async function requestScreen(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  } catch {
    return null;
  }
}

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/**
 * Builds and registers media for a new source of the given type.
 * Returns a Source ready for sceneStore.addSource(), or null if the user cancelled/denied.
 */
export async function createSourceForType(
  type: SourceType,
  opts?: SourceCreationOptions
): Promise<Source | null> {
  let name: string;
  let element: HTMLVideoElement | HTMLCanvasElement;
  let stream: MediaStream | undefined;
  let kind: 'video' | 'canvas';
  let width: number;
  let height: number;
  let transform: Transform;
  let audio: boolean;

  switch (type) {
    case 'screen': {
      const s = await requestScreen();
      if (!s) return null;
      stream = s;
      element = createVideoElementForStream(s);
      kind = 'video';
      width = 1920;
      height = 1080;
      transform = fullRect();
      name = 'Display Capture';
      audio = s.getAudioTracks().length > 0;
      break;
    }
    case 'camera': {
      const s = await requestCamera();
      if (!s) return null;
      stream = s;
      element = createVideoElementForStream(s);
      kind = 'video';
      width = 1280;
      height = 720;
      transform = cornerOverlayRect();
      name = 'Webcam';
      audio = false;
      break;
    }
    case 'image': {
      const file = await pickImageFile();
      if (!file) return null;
      const { canvas, width: iw, height: ih } = await createImageCanvas(file);
      element = canvas;
      kind = 'canvas';
      width = iw;
      height = ih;
      transform = fullRect();
      name = file.name.replace(/\.[^.]+$/, '');
      audio = false;
      break;
    }
    case 'text': {
      const canvas = createTextCanvas({ ...DEFAULT_TEXT_OPTIONS, ...opts?.text });
      element = canvas;
      kind = 'canvas';
      width = canvas.width;
      height = canvas.height;
      transform = fullRect();
      name = 'Text';
      audio = false;
      break;
    }
    case 'color': {
      const canvas = createColorCanvas(opts?.color ?? '#000000');
      element = canvas;
      kind = 'canvas';
      width = canvas.width;
      height = canvas.height;
      transform = fullRect();
      name = 'Color Source';
      audio = false;
      break;
    }
    default:
      return null;
  }

  const id = generateId('src');
  if (kind === 'canvas') {
    element.id = id;
  }
  registerSourceMedia(id, { element, kind, stream, width, height });

  if (audio && stream) {
    getAudioMixer().addChannel(id, stream, 1, false);
    useAudioStore.getState().addChannel({ id, name, volume: 1, muted: false });
  }

  return {
    id,
    type,
    name,
    visible: true,
    locked: false,
    transform,
    filters: [],
    volume: 1,
    muted: false,
  };
}