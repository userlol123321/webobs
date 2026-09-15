import { useEffect } from 'react';
import { useSceneStore } from '../stores/sceneStore';
import { useRecorderStore } from '../stores/recorderStore';
import { removeSourceMedia } from '../engine/sourceMedia';

export interface HotkeyActions {
  toggleRecording: () => void;
}

const isEditing =
  (e: KeyboardEvent) =>
    (e.target as HTMLElement | null)?.closest?.('input, select, textarea, [contenteditable="true"]') != null;

export function useHotkeys({ toggleRecording }: HotkeyActions): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditing(e)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const store = useSceneStore.getState();
        const ids = store.selectedSourceIds;
        if (ids.length === 0) return;
        e.preventDefault();
        ids.forEach((id) => {
          removeSourceMedia(id);
          store.removeSource(id);
        });
      }

      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        toggleRecording();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleRecording]);
}

export function isRecordingActive(): boolean {
  const { state } = useRecorderStore.getState();
  return state === 'recording' || state === 'paused';
}