import { useEffect, useRef } from 'react';
import { getAudioMixer } from '../engine/audio/AudioMixer';
import { useAudioStore } from '../stores/audioStore';

/**
 * Continuously polls VU levels from the AudioMixer analysers and pushes them into
 * audioStore. Sampling happens every animation frame; store updates are throttled to ~25Hz.
 */
export function useAudioMeters(): void {
  const state = useRef({ lastPush: 0, lastLevel: 0 });

  useEffect(() => {
    const mixer = getAudioMixer();
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const store = useAudioStore.getState();
      const channelIds = Object.keys(store.channels);
      if (channelIds.length === 0) return;

      let peak: number = 0;
      let readingDb = -100;
      for (const id of channelIds) {
        if (!store.channels[id].hasLevels) continue;
        const m = mixer.pollMeter(id);
        if (m.level > peak) {
          peak = m.level;
          readingDb = m.db;
        }
      }

      const refined = Math.max(peak, state.current.lastLevel * 0.9);
      state.current.lastLevel = refined;

      if (now - state.current.lastPush > 40) {
        state.current.lastPush = now;
        for (const id of channelIds) {
          store.updateMeter(id, refined, readingDb);
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}