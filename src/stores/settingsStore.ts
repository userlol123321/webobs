import { create } from 'zustand';
import type { OutputSettings, TransitionType } from '../types';

interface SettingsState {
  output: OutputSettings;
  canvasWidth: number;
  canvasHeight: number;
  transitionType: TransitionType;
  transitionDuration: number;
  setResolution: (width: number, height: number) => void;
  setFps: (fps: number) => void;
  setFormat: (format: 'webm' | 'mp4') => void;
  setBitrate: (video: number, audio: number) => void;
  setTransitionType: (type: TransitionType) => void;
  setTransitionDuration: (ms: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  output: {
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    format: 'webm',
    videoBitrate: 16_000_000,
    audioBitrate: 128_000,
  },
  canvasWidth: 1920,
  canvasHeight: 1080,
  transitionType: 'fade',
  transitionDuration: 300,

  setResolution: (width, height) =>
    set((state) => ({
      output: { ...state.output, resolution: { width, height } },
      canvasWidth: width,
      canvasHeight: height,
    })),

  setFps: (fps) => set((state) => ({ output: { ...state.output, fps } })),
  setFormat: (format) => set((state) => ({ output: { ...state.output, format } })),
  setBitrate: (video, audio) =>
    set((state) => ({
      output: { ...state.output, videoBitrate: video, audioBitrate: audio },
    })),
  setTransitionType: (type) => set({ transitionType: type }),
  setTransitionDuration: (ms) => set({ transitionDuration: ms }),
}));