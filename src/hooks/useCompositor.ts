import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Compositor, type RenderItem } from '../engine/Compositor';
import { buildSceneItems } from '../engine/sceneGraph';
import { useSceneStore } from '../stores/sceneStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useRecorderStore } from '../stores/recorderStore';

interface TransitionState {
  fromSceneId: string;
  toSceneId: string;
  startTime: number;
  duration: number;
}

export interface CompositorController {
  compositor: Compositor | null;
  canvasWidth: number;
  canvasHeight: number;
  stream: MediaStream | null;
  getStream: () => MediaStream;
}

export function useCompositor(canvasRef: RefObject<HTMLCanvasElement | null>): CompositorController {
  const compositorRef = useRef<Compositor | null>(null);
  const [controller, setController] = useState<CompositorController>({
    compositor: null,
    canvasWidth: 1920,
    canvasHeight: 1080,
    stream: null,
    getStream: () => {
      throw new Error('Compositor not ready');
    },
  });

  const transitionRef = useRef<TransitionState | null>(null);
  const lastSceneIdRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const bgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFrameTimeRef = useRef(0);
  const fpsWindowRef = useRef({ start: 0, frames: 0, fps: 0 });
  const cpuLoadRef = useRef(0);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  const tick = useCallback(() => {
    const comp = compositorRef.current;
    if (!comp) return;

    const t0 = performance.now();
    const sceneState = useSceneStore.getState();
    const now = performance.now();

    const activeScene = sceneState.scenes.find((s) => s.id === sceneState.activeSceneId);
    let items: RenderItem[] = [];

    const tr = transitionRef.current;
    if (tr) {
      const progress = Math.min(1, Math.max(0, (now - tr.startTime) / tr.duration));
      const fromScene = sceneState.scenes.find((s) => s.id === tr.fromSceneId);
      const toScene = sceneState.scenes.find((s) => s.id === tr.toSceneId);

      if (progress >= 1) {
        transitionRef.current = null;
        lastSceneIdRef.current = tr.toSceneId;
        items = buildSceneItems({ scene: toScene, sources: sceneState.sources });
      } else {
        items = [
          ...buildSceneItems({ scene: fromScene, sources: sceneState.sources }),
          ...buildSceneItems({
            scene: toScene,
            sources: sceneState.sources,
            opacityFor: () => progress,
          }),
        ];
      }
    } else {
      if (activeScene && lastSceneIdRef.current !== activeScene.id) {
        const { transitionType, transitionDuration } = useSettingsStore.getState();
        const hasPrevScene = !!lastSceneIdRef.current;
        if (transitionType === 'fade' && transitionDuration > 0 && hasPrevScene) {
          transitionRef.current = {
            fromSceneId: lastSceneIdRef.current!,
            toSceneId: activeScene.id,
            startTime: now,
            duration: transitionDuration,
          };
          lastSceneIdRef.current = activeScene.id;
          // Render a near-invisible frame of the new scene over the old one to avoid flashing.
          const fromScene = sceneState.scenes.find((s) => s.id === transitionRef.current!.fromSceneId);
          items = [
            ...buildSceneItems({ scene: fromScene, sources: sceneState.sources }),
            ...buildSceneItems({
              scene: activeScene,
              sources: sceneState.sources,
              opacityFor: () => 0.01,
            }),
          ];
        } else {
          lastSceneIdRef.current = activeScene.id;
          items = buildSceneItems({ scene: activeScene, sources: sceneState.sources });
        }
      } else {
        items = buildSceneItems({ scene: activeScene, sources: sceneState.sources });
      }
    }

    comp.render(items);

    // Record last frame id if not already set
    if (lastSceneIdRef.current === null && sceneState.activeSceneId) {
      lastSceneIdRef.current = sceneState.activeSceneId;
    }

    // FPS + CPU estimation
    const frameEnd = performance.now();
    const frameTime = frameEnd - t0;
    lastFrameTimeRef.current = frameTime;

    const win = fpsWindowRef.current;
    win.frames++;
    if (frameEnd - win.start >= 1000) {
      const fps = (win.frames * 1000) / (frameEnd - win.start);
      win.fps = Math.round(fps);
      win.start = frameEnd;
      win.frames = 0;

      // Approximate CPU load as render time vs a 60fps budget
      const budget = 1000 / 60;
      const load = Math.min(100, (frameTime / budget) * 100);
      cpuLoadRef.current = cpuLoadRef.current * 0.9 + load * 0.1;

      useRecorderStore.getState().setStats(win.fps, Math.round(cpuLoadRef.current));
    }
  }, []);

  // Render loop management + visibility switching
  const manageLoop = useCallback(() => {
    const startRaf = () => {
      if (rafIdRef.current !== null) return;
      const loop = () => {
        rafIdRef.current = requestAnimationFrame(loop);
        tick();
      };
      rafIdRef.current = requestAnimationFrame(loop);
    };
    const stopRaf = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    const startBackground = () => {
      if (bgTimerRef.current) return;
      bgTimerRef.current = setInterval(() => tick(), 1000);
    };
    const stopBackground = () => {
      if (bgTimerRef.current) {
        clearInterval(bgTimerRef.current);
        bgTimerRef.current = null;
      }
    };

    const apply = () => {
      if (document.hidden) {
        stopRaf();
        startBackground();
      } else {
        stopBackground();
        startRaf();
      }
    };

    visibilityHandlerRef.current = apply;
    document.addEventListener('visibilitychange', apply);
    apply();
  }, [tick]);

  // Init compositor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const settings = useSettingsStore.getState();
    let comp: Compositor;
    try {
      comp = new Compositor(canvas);
      comp.init(settings.canvasWidth, settings.canvasHeight);
    } catch (err) {
      console.error('Compositor init failed:', err);
      return;
    }
    compositorRef.current = comp;
    setController({
      compositor: comp,
      canvasWidth: settings.canvasWidth,
      canvasHeight: settings.canvasHeight,
      stream: null,
      getStream: () => {
        const c = compositorRef.current;
        if (!c) throw new Error('Compositor not ready');
        return c.getStream(useSettingsStore.getState().output.fps);
      },
    });

    manageLoop();

    const unsubRes = useSettingsStore.subscribe((state, prev) => {
      if (state.canvasWidth !== prev.canvasWidth || state.canvasHeight !== prev.canvasHeight) {
        compositorRef.current?.setResolution(state.canvasWidth, state.canvasHeight);
        setController((c) => ({
          compositor: c.compositor,
          canvasWidth: state.canvasWidth,
          canvasHeight: state.canvasHeight,
          stream: c.stream,
          getStream: c.getStream,
        }));
      }
    });

    // Cleanup
    return () => {
      unsubRes();
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      }
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (bgTimerRef.current) clearInterval(bgTimerRef.current);
      compositorRef.current?.dispose();
      compositorRef.current = null;
    };
  }, [canvasRef, manageLoop]);

  return controller;
}