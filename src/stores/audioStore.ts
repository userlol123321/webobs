import { create } from 'zustand';
import { generateId } from '../utils/generate-id';

export interface AudioChannel {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  meterLevel: number;
  meterDb: number;
  hasLevels: boolean;
}

interface AudioState {
  channels: Record<string, AudioChannel>;
  addChannel: (partial: Partial<AudioChannel> & { id?: string }) => AudioChannel;
  removeChannel: (id: string) => void;
  renameChannel: (id: string, name: string) => void;
  setVolume: (id: string, volume: number) => void;
  setMuted: (id: string, muted: boolean) => void;
  updateMeter: (id: string, level: number, db: number) => void;
  setHasLevels: (id: string, has: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  channels: {},

  addChannel: (partial) => {
    const id = partial.id ?? generateId('chan');
    const channel: AudioChannel = {
      id,
      name: '',
      volume: 1,
      muted: false,
      meterLevel: 0,
      meterDb: 0,
      hasLevels: true,
      ...partial,
    };
    set((state) => ({ channels: { ...state.channels, [id]: channel } }));
    return channel;
  },

  removeChannel: (id) =>
    set((state) => {
      const next = { ...state.channels };
      delete next[id];
      return { channels: next };
    }),

  renameChannel: (id, name) =>
    set((state) => {
      const ch = state.channels[id];
      if (!ch) return state;
      return { channels: { ...state.channels, [id]: { ...ch, name } } };
    }),

  setVolume: (id, volume) =>
    set((state) => {
      const ch = state.channels[id];
      if (!ch) return state;
      return { channels: { ...state.channels, [id]: { ...ch, volume } } };
    }),

  setMuted: (id, muted) =>
    set((state) => {
      const ch = state.channels[id];
      if (!ch) return state;
      return { channels: { ...state.channels, [id]: { ...ch, muted } } };
    }),

  updateMeter: (id, level, db) =>
    set((state) => {
      const ch = state.channels[id];
      if (!ch) return state;
      return { channels: { ...state.channels, [id]: { ...ch, meterLevel: level, meterDb: db } } };
    }),

  setHasLevels: (id, has) =>
    set((state) => {
      const ch = state.channels[id];
      if (!ch) return state;
      return { channels: { ...state.channels, [id]: { ...ch, hasLevels: has } } };
    }),
}));