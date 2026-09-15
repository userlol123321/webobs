import { useSettingsStore } from '../../stores/settingsStore';
import type { TextOptions } from '../../types';

export type TextSourceOptions = TextOptions;

export const DEFAULT_TEXT_OPTIONS: TextSourceOptions = {
  text: 'Text Source',
  fontFamily: 'Open Sans, sans-serif',
  fontSize: 48,
  color: '#ffffff',
  backgroundColor: 'rgba(0,0,0,0)',
  bold: false,
  outline: true,
  outlineColor: '#000000',
  outlineWidth: 3,
  align: 'center',
  vertical: 'center',
};

export function renderTextCanvas(canvas: HTMLCanvasElement, options: TextSourceOptions): void {
  const { canvasWidth, canvasHeight } = useSettingsStore.getState();
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const opts = { ...DEFAULT_TEXT_OPTIONS, ...options };
  const fontSize = opts.fontSize ?? DEFAULT_TEXT_OPTIONS.fontSize ?? 48;
  const fontWeight = opts.bold ? '700' : '400';
  const font = `${fontWeight} ${fontSize}px ${opts.fontFamily}`;
  ctx.font = font;

  const lines = opts.text.split('\n');
  const lineHeight = fontSize * 1.25;

  let startY: number;
  const totalHeight = lineHeight * lines.length;
  if (opts.vertical === 'center') startY = (canvas.height - totalHeight) / 2 + lineHeight;
  else if (opts.vertical === 'bottom') startY = canvas.height - 24 - totalHeight + lineHeight;
  else startY = lineHeight;

  ctx.textBaseline = 'top';

  for (let i = 0; i < lines.length; i++) {
    let x: number;
    if (opts.align === 'center') x = (canvas.width - (opts.text.length ? ctx.measureText(lines[i]).width : 0)) / 2;
    else if (opts.align === 'right') x = canvas.width - ctx.measureText(lines[i]).width - 24;
    else x = 24;

    if (opts.outline) {
      ctx.strokeStyle = opts.outlineColor ?? '#000000';
      ctx.lineWidth = opts.outlineWidth ?? 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(lines[i], x, startY + i * lineHeight);
    }
    ctx.fillStyle = opts.color ?? '#ffffff';
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

export function createTextCanvas(options: TextSourceOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  renderTextCanvas(canvas, options);
  return canvas;
}

export function createColorCanvas(color: string): HTMLCanvasElement {
  const { canvasWidth, canvasHeight } = useSettingsStore.getState();
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

export async function createImageCanvas(file: File | string): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const src = typeof file === 'string' ? file : URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(img, 0, 0);
  if (typeof file !== 'string') URL.revokeObjectURL(src);
  return { canvas, width: img.naturalWidth, height: img.naturalHeight };
}