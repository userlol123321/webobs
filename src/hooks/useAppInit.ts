import { useCallback, useState } from 'react';
import type { ResourceState } from '../types';
import { getAudioMixer } from '../engine/audio/AudioMixer';
import { createSourceForType, type SourceCreationOptions } from '../engine/sources/createSource';
import { loadLayout, type SavedSource } from '../engine/layoutStorage';
import { useSceneStore } from '../stores/sceneStore';
import { useAudioStore } from '../stores/audioStore';
import { useSettingsStore } from '../stores/settingsStore';
import { generateId } from '../utils/generate-id';

export interface ActivationStatus {
  screen: ResourceState;
  camera: ResourceState;
  mic: ResourceState;
  message: string;
}

const initialState: ActivationStatus = {
  screen: 'uninitialized',
  camera: 'uninitialized',
  mic: 'uninitialized',
  message: 'Ready to start your studio',
};

const savedLayout = loadLayout();

export function useAppInit() {
  const [status, setStatus] = useState<ActivationStatus>(initialState);

  const activate = useCallback(async (): Promise<void> => {
    // 1) Screen capture — requires user gesture; fatal if cancelled/denied.
    setStatus((s) => ({ ...s, screen: 'activating', message: 'Waiting for screen sharing…' }));
    let screenStream: MediaStream;
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch {
      setStatus((s) => ({ ...s, screen: 'error', message: 'Screen sharing was declined.' }));
      throw new Error('Screen capture is required. Please allow screen sharing to continue.');
    }
    setStatus((s) => ({ ...s, screen: 'active', message: 'Screen captured' }));

    // 2) Camera — best-effort; non-fatal if declined.
    setStatus((s) => ({ ...s, camera: 'activating', message: 'Starting camera…' }));
    let cameraStream: MediaStream | null = null;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStatus((s) => ({ ...s, camera: 'active' }));
    } catch {
      setStatus((s) => ({
        ...s,
        camera: 'error',
        message: 'Camera unavailable — continuing without it.',
      }));
    }

    // 3) Microphone — best-effort; non-fatal if declined.
    setStatus((s) => ({ ...s, mic: 'activating', message: 'Starting microphone…' }));
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus((s) => ({ ...s, mic: 'active' }));
    } catch {
      setStatus((s) => ({
        ...s,
        mic: 'error',
        message: 'Microphone unavailable — continuing without it.',
      }));
    }

    const mixer = getAudioMixer();
    await mixer.resume();

    if (savedLayout) {
      const s = savedLayout.settings;
      useSettingsStore.setState({
        transitionType: s.transitionType,
        transitionDuration: s.transitionDuration,
      });
      useSettingsStore.getState().setResolution(s.resolution.width, s.resolution.height);
      useSettingsStore.getState().setFps(s.fps);
      useSettingsStore.getState().setFormat(s.format);
      useSettingsStore.getState().setBitrate(s.videoBitrate, s.audioBitrate);
    }

    useSceneStore.getState().addScene(savedLayout?.sceneName ?? 'Scene 1');

    const optsFor = (saved: SavedSource): SourceCreationOptions => {
      switch (saved.type) {
        case 'screen':
          return { stream: screenStream };
        case 'camera':
          return { stream: cameraStream ?? undefined };
        case 'text':
          return { text: saved.textOptions };
        case 'color':
          return { color: saved.color };
        default:
          return {};
      }
    };

    if (savedLayout) {
      for (const saved of savedLayout.sources) {
        if (saved.type === 'image') continue;
        const created = await createSourceForType(saved.type, optsFor(saved));
        if (!created) continue;
        useSceneStore.getState().addSource(created);
        useSceneStore.getState().updateSourceMeta(created.id, {
          name: saved.name,
          visible: saved.visible,
          locked: saved.locked,
          transform: saved.transform,
          filters: saved.filters,
          textOptions: saved.textOptions,
          color: saved.color,
        });
      }
    } else {
      const screenCreated = await createSourceForType('screen', { stream: screenStream });
      if (screenCreated) useSceneStore.getState().addSource(screenCreated);
      if (cameraStream) {
        const camCreated = await createSourceForType('camera', { stream: cameraStream });
        if (camCreated) useSceneStore.getState().addSource(camCreated);
      }
    }

    // Microphone channel
    if (micStream) {
      const micId = generateId('src');
      mixer.addChannel(micId, micStream, 1, false);
      useAudioStore.getState().addChannel({
        id: micId,
        name: 'Microphone',
        volume: 1,
        muted: false,
      });
    }

    setStatus((s) => ({ ...s, message: 'Everything is ready' }));
  }, []);

  return { activate, status };
}