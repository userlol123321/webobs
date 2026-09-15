import { useCallback, useState } from 'react';
import type { ResourceState } from '../types';
import {
  registerSourceMedia,
  createVideoElementForStream,
} from '../engine/sourceMedia';
import { getAudioMixer } from '../engine/audio/AudioMixer';
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

export function useAppInit() {
  const [status, setStatus] = useState<ActivationStatus>(initialState);

  const activate = useCallback(async (): Promise<void> => {
    const sceneStore = useSceneStore.getState();
    const settings = useSettingsStore.getState();

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

    // Build the default scene + sources
    const width = settings.canvasWidth;
    const height = settings.canvasHeight;

    const screenId = generateId('src');
    const screenVideo = createVideoElementForStream(screenStream);
    registerSourceMedia(screenId, {
      element: screenVideo,
      kind: 'video',
      stream: screenStream,
      width,
      height,
    });
    sceneStore.addSource({
      id: screenId,
      type: 'screen',
      name: 'Display Capture',
      visible: true,
      locked: false,
      transform: {
        x: 0,
        y: 0,
        width,
        height,
        rotation: 0,
        cropLeft: 0,
        cropTop: 0,
        cropRight: 0,
        cropBottom: 0,
      },
      filters: [],
      volume: 1,
      muted: false,
    });
    // System audio from the shared screen/tab
    const screenAudioTracks = screenStream.getAudioTracks();
    if (screenAudioTracks.length > 0) {
      mixer.addChannel(screenId, screenStream, 1, false);
      useAudioStore.getState().addChannel({
        id: screenId,
        name: 'Display Capture',
        volume: 1,
        muted: false,
      });
    }

    // Camera overlay (bottom-right, ~30% width)
    if (cameraStream) {
      const camId = generateId('src');
      const camVideo = createVideoElementForStream(cameraStream);
      registerSourceMedia(camId, {
        element: camVideo,
        kind: 'video',
        stream: cameraStream,
        width: 1280,
        height: 720,
      });
      const camW = Math.round(width * 0.3);
      const camH = Math.round((camW * 720) / 1280) * (cameraStream.getVideoTracks()[0] ? 1 : 1);
      const tightCamH = Math.min(camH, Math.round(height * 0.4));
      sceneStore.addSource({
        id: camId,
        type: 'camera',
        name: 'Webcam',
        visible: true,
        locked: false,
        transform: {
          x: width - camW - 24,
          y: height - tightCamH - 24,
          width: camW,
          height: tightCamH,
          rotation: 0,
          cropLeft: 0,
          cropTop: 0,
          cropRight: 0,
          cropBottom: 0,
        },
        filters: [],
        volume: 1,
        muted: false,
      });
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