import { create } from 'zustand';
import type { RecordingState } from '../types';

interface RecorderState {
  state: RecordingState;
  sessionId: string | null;
  startTime: number | null;
  elapsed: number;
  fileSize: number;
  droppedFrames: number;
  fps: number;
  cpu: number;
  recoveryCandidate: boolean;

  setRecording: (state: RecordingState) => void;
  setSession: (id: string | null, startTime: number | null) => void;
  setElapsed: (seconds: number) => void;
  setFileSize: (bytes: number) => void;
  setStats: (fps: number, cpu: number) => void;
  addDroppedFrames: (count: number) => void;
  setRecoveryCandidate: (value: boolean) => void;
}

const SECONDS_TICK = 250;

export const useRecorderStore = create<RecorderState>((set) => ({
  state: 'idle',
  sessionId: null,
  startTime: null,
  elapsed: 0,
  fileSize: 0,
  droppedFrames: 0,
  fps: 0,
  cpu: 0,
  recoveryCandidate: false,

  setRecording: (state) => set({ state }),

  setSession: (id, startTime) =>
    set({ sessionId: id, startTime, elapsed: 0, fileSize: 0, droppedFrames: 0 }),

  setElapsed: (seconds) => set({ elapsed: seconds }),

  setFileSize: (bytes) => set({ fileSize: bytes }),

  setStats: (fps, cpu) => set({ fps, cpu }),

  addDroppedFrames: (count) => set((s) => ({ droppedFrames: s.droppedFrames + count })),

  setRecoveryCandidate: (value) => set({ recoveryCandidate: value }),
}));

let elapsedTimer: ReturnType<typeof setInterval> | null = null;

export function startElapsedTimer() {
  if (elapsedTimer) return;
  elapsedTimer = setInterval(() => {
    const s = useRecorderStore.getState();
    if (s.state === 'recording' && s.startTime != null) {
      s.setElapsed((Date.now() - s.startTime) / 1000);
    }
  }, SECONDS_TICK);
}

export function stopElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}