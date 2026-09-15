import { create } from 'zustand';
import type { Scene, Source, Transform, VideoFilter } from '../types';
import { generateId } from '../utils/generate-id';

interface SceneState {
  scenes: Scene[];
  activeSceneId: string | null;
  sources: Record<string, Source>;
  selectedSourceIds: string[];

  setActiveScene: (id: string) => void;
  addScene: (name?: string) => Scene;
  removeScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
  reorderScene: (from: number, to: number) => void;
  duplicateScene: (id: string) => void;

  addSource: (source: Source & { id?: string }) => Source;
  addExistingSource: (sourceId: string, sceneId: string) => void;
  removeSource: (sourceId: string) => void;
  renameSource: (sourceId: string, name: string) => void;
  moveSource: (from: number, to: number) => void;
  toggleVisible: (sourceId: string) => void;
  toggleLocked: (sourceId: string) => void;
  updateSourceTransform: (sourceId: string, rect: Partial<Transform>) => void;
  updateSourceMeta: (sourceId: string, patch: Partial<Source>) => void;
  setSelectedSources: (ids: string[]) => void;

  addFilter: (sourceId: string, filter: Omit<VideoFilter, 'id'>) => void;
  removeFilter: (sourceId: string, filterId: string) => void;
  toggleFilter: (sourceId: string, filterId: string) => void;
  updateFilterParams: (sourceId: string, filterId: string, params: Record<string, number>) => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  activeSceneId: null,
  sources: {},
  selectedSourceIds: [],

  setActiveScene: (id) => set({ activeSceneId: id, selectedSourceIds: [] }),

  addScene: (name) => {
    const scene: Scene = {
      id: generateId('scene'),
      name: name ?? `Scene ${get().scenes.length + 1}`,
      sourceIds: [],
    };
    set((state) => ({
      scenes: [...state.scenes, scene],
      activeSceneId: state.activeSceneId ?? scene.id,
    }));
    return scene;
  },

  removeScene: (id) => {
    const state = get();
    const scene = state.scenes.find((s) => s.id === id);
    if (!scene) return;
    const freedIds = new Set(scene.sourceIds.filter((sid) => {
      return !state.scenes.some((s) => s.id !== id && s.sourceIds.includes(sid));
    }));
    const nextSources = { ...state.sources };
    freedIds.forEach((sid) => delete nextSources[sid]);
    const remaining = state.scenes.filter((s) => s.id !== id);
    set({
      scenes: remaining,
      sources: nextSources,
      activeSceneId: state.activeSceneId === id ? (remaining[0]?.id ?? null) : state.activeSceneId,
      selectedSourceIds: [],
    });
  },

  renameScene: (id, name) =>
    set((state) => ({
      scenes: state.scenes.map((s) => (s.id === id ? { ...s, name } : s)),
    })),

  reorderScene: (from, to) =>
    set((state) => {
      const next = [...state.scenes];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { scenes: next };
    }),

  duplicateScene: (id) => {
    const state = get();
    const scene = state.scenes.find((s) => s.id === id);
    if (!scene) return;
    const sourceIdMap: Record<string, string> = {};
    const dupSources = { ...state.sources };
    scene.sourceIds.forEach((sid) => {
      const src = state.sources[sid];
      if (!src) return;
      const newId = generateId('src');
      sourceIdMap[sid] = newId;
      dupSources[newId] = { ...src, id: newId, name: `${src.name} (copy)` };
    });
    const dupScene: Scene = {
      id: generateId('scene'),
      name: `${scene.name} (copy)`,
      sourceIds: scene.sourceIds.map((sid) => sourceIdMap[sid]).filter(Boolean),
    };
    set((st) => ({
      scenes: [...st.scenes, dupScene],
      sources: dupSources,
      activeSceneId: dupScene.id,
      selectedSourceIds: [],
    }));
  },

  addSource: (source) => {
    const { id = generateId('src'), ...rest } = source;
    const full: Source = { ...rest, id };
    set((state) => {
      const activeScene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!activeScene) return { sources: { ...state.sources, [id]: full } };
      return {
        sources: { ...state.sources, [id]: full },
        scenes: state.scenes.map((s) =>
          s.id === activeScene.id ? { ...s, sourceIds: [...s.sourceIds, id] } : s
        ),
        selectedSourceIds: [id],
      };
    });
    return full;
  },

  addExistingSource: (sourceId, sceneId) =>
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, sourceIds: [...s.sourceIds, sourceId] } : s
      ),
    })),

  removeSource: (sourceId) =>
    set((state) => ({
      sources: { ...state.sources, [sourceId]: { ...state.sources[sourceId], visible: false } },
      scenes: state.scenes.map((s) => ({
        ...s,
        sourceIds: s.sourceIds.filter((id) => id !== sourceId),
      })),
      selectedSourceIds: state.selectedSourceIds.filter((id) => id !== sourceId),
    })),

  renameSource: (sourceId, name) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return { sources: { ...state.sources, [sourceId]: { ...src, name } } };
    }),

  moveSource: (from, to) =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!scene) return state;
      const nextIds = [...scene.sourceIds];
      const [moved] = nextIds.splice(from, 1);
      nextIds.splice(to, 0, moved);
      return {
        scenes: state.scenes.map((s) => (s.id === scene.id ? { ...s, sourceIds: nextIds } : s)),
      };
    }),

  toggleVisible: (sourceId) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return { sources: { ...state.sources, [sourceId]: { ...src, visible: !src.visible } } };
    }),

  toggleLocked: (sourceId) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return { sources: { ...state.sources, [sourceId]: { ...src, locked: !src.locked } } };
    }),

  updateSourceTransform: (sourceId, rect: Partial<Transform>) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return {
        sources: {
          ...state.sources,
          [sourceId]: { ...src, transform: { ...src.transform, ...rect } },
        },
      };
    }),

  updateSourceMeta: (sourceId, patch) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return {
        sources: { ...state.sources, [sourceId]: { ...src, ...patch } },
      };
    }),

  setSelectedSources: (ids) => set({ selectedSourceIds: ids }),

  addFilter: (sourceId, filter) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return {
        sources: {
          ...state.sources,
          [sourceId]: {
            ...src,
            filters: [...src.filters, { id: generateId('filter'), ...filter }],
          },
        },
      };
    }),

  removeFilter: (sourceId, filterId) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return {
        sources: {
          ...state.sources,
          [sourceId]: { ...src, filters: src.filters.filter((f) => f.id !== filterId) },
        },
      };
    }),

  toggleFilter: (sourceId, filterId) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return {
        sources: {
          ...state.sources,
          [sourceId]: {
            ...src,
            filters: src.filters.map((f) =>
              f.id === filterId ? { ...f, enabled: !f.enabled } : f
            ),
          },
        },
      };
    }),

  updateFilterParams: (sourceId, filterId, params) =>
    set((state) => {
      const src = state.sources[sourceId];
      if (!src) return state;
      return {
        sources: {
          ...state.sources,
          [sourceId]: {
            ...src,
            filters: src.filters.map((f) =>
              f.id === filterId ? { ...f, params: { ...f.params, ...params } } : f
            ),
          },
        },
      };
    }),
}));