import { useEffect } from 'react';
import { useSceneStore } from '../stores/sceneStore';
import { useSettingsStore } from '../stores/settingsStore';
import { saveLayout } from '../engine/layoutStorage';

export function useLayoutPersistence(): void {
  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      if (timer !== undefined) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        saveLayout();
      }, 300);
    };
    const flush = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
      saveLayout();
    };
    const unsubScene = useSceneStore.subscribe(schedule);
    const unsubSettings = useSettingsStore.subscribe(schedule);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      unsubScene();
      unsubSettings();
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);
}