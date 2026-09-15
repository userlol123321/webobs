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
    const unsubScene = useSceneStore.subscribe(schedule);
    const unsubSettings = useSettingsStore.subscribe(schedule);
    return () => {
      unsubScene();
      unsubSettings();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);
}