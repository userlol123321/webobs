import { useEffect, useState } from 'react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export function useMenuPosition() {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);
  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('contextmenu', close);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('contextmenu', close);
      window.removeEventListener('blur', close);
    };
  }, [position]);
  return { position, setPosition };
}

export function placeMenuWithinViewport(
  el: HTMLElement,
  x: number,
  y: number
): { left: string; top: string } {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = x + rect.width > vw ? `${vw - rect.width - 4}px` : `${x}px`;
  const top = y + rect.height > vh ? `${vh - rect.height - 4}px` : `${y}px`;
  return { left, top };
}