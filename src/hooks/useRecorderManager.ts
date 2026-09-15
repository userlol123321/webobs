import { useCallback, useEffect, useRef } from 'react';
import { ResilientRecorder } from '../engine/recorder/ResilientRecorder';
import * as DB from '../engine/recorder/RecordingDB';
import { getAudioMixer } from '../engine/audio/AudioMixer';
import { useRecorderStore, startElapsedTimer, stopElapsedTimer } from '../stores/recorderStore';
import { useSettingsStore } from '../stores/settingsStore';

type OnStopHandler = (sessionId: string) => void;

export function useRecorderManager(getCanvasStream: () => MediaStream, onStop?: OnStopHandler) {
  const recorderRef = useRef<ResilientRecorder | null>(null);
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  const start = useCallback(
    async (): Promise<void> => {
      const store = useRecorderStore.getState();
      if (store.state !== 'idle') return;

      const settings = useSettingsStore.getState();
      const recorder = new ResilientRecorder();
      recorderRef.current = recorder;

      const videoStream = getCanvasStream();
      const audioStream = getAudioMixer().recordingStream;
      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      // Prefer format set in settings; fall back to whatever is supported.
      const preferredType =
        settings.output.format === 'mp4'
          ? 'video/mp4'
          : settings.output.format === 'webm'
            ? 'video/webm;codecs=vp9,opus'
            : undefined;

      await recorder.start({
        stream: combined,
        mimeType: preferredType,
        videoBitsPerSecond: settings.output.videoBitrate,
        audioBitsPerSecond: settings.output.audioBitrate,
        onSizeChange: (bytes) => useRecorderStore.getState().setFileSize(bytes),
        onStop: () => {
          // Natural stop (e.g. user stops sharing): leave the session unrecovered
          // so the recovery dialog can still salvage the stored chunks.
          const id = recorder.getSessionId();
          stopElapsedTimer();
          useRecorderStore.getState().setRecording('idle');
          onStopRef.current?.(id);
        },
        onError: (err) => {
          console.error('Recording error:', err);
        },
      });

      useRecorderStore.getState().setSession(recorder.getSessionId(), Date.now());
      useRecorderStore.getState().setRecording('recording');
      startElapsedTimer();
    },
    [getCanvasStream]
  );

  const stop = useCallback(async (): Promise<string | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return null;
    recorderRef.current = null;
    const sessionId = recorder.getSessionId();
    stopElapsedTimer();
    let blob: Blob;
    try {
      blob = await recorder.stop();
    } catch (err) {
      blob = await ResilientRecorder.rebuildFromChunks(sessionId).then((r) => r?.blob ?? new Blob());
      void err;
    }
    if (blob.size > 0) {
      downloadBlob(blob, recorder.getSessionName());
    }
    await DB.markSessionFinished(sessionId);
    useRecorderStore.getState().setRecording('idle');
    return sessionId;
  }, []);

  const pause = useCallback(() => {
    const m = useRecorderStore.getState();
    const r = recorderRef.current;
    if (m.state === 'recording') {
      r?.pause();
      useRecorderStore.getState().setRecording('paused');
    }
  }, []);

  const resume = useCallback(() => {
    const m = useRecorderStore.getState();
    const r = recorderRef.current;
    if (m.state === 'paused') {
      r?.resume();
      useRecorderStore.getState().setRecording('recording');
    }
  }, []);

  // Warn before leaving while recording.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { state } = useRecorderStore.getState();
      if (state === 'recording' || state === 'paused') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return { start, stop, pause, resume };
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadBlobAndRevoke(blob: Blob, name: string): void {
  downloadBlob(blob, name);
}