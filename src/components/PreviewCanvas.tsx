import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useSceneStore } from '../stores/sceneStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { Transform } from '../types';
import { Icon } from './UI/Icons';
import { ContextMenu, type ContextMenuItem } from './UI/ContextMenu';
import { useMenuPosition } from '../hooks/useMenuPosition';
import { removeSourceMedia } from '../engine/sourceMedia';
import './preview.css';

interface PointerState {
  mode: 'move' | 'resize';
  sourceId: string;
  startMouse: { x: number; y: number };
  startTransform: Transform;
  active: boolean;
}

export function PreviewCanvas({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const scenes = useSceneStore((s) => s.scenes);
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const sources = useSceneStore((s) => s.sources);
  const selectedSourceIds = useSceneStore((s) => s.selectedSourceIds);
  const { canvasWidth, canvasHeight } = useSettingsStore();

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  const pointerRef = useRef<PointerState | null>(null);
  const scaleRef = useRef(1);
  const { position, setPosition } = useMenuPosition();
  const [contextSourceId, setContextSourceId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      const cw = frame.clientWidth - 2;
      const ch = frame.clientHeight - 2;
      const s = Math.min(cw / canvasWidth, ch / canvasHeight);
      setScale(s > 0 ? s : 0);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const p = pointerRef.current;
      if (!p) return;
      const dx = e.clientX - p.startMouse.x;
      const dy = e.clientY - p.startMouse.y;
      // OBS behavior: press selects immediately, dragging starts once the
      // pointer actually moves a few pixels (so clicks don't nudge sources).
      if (!p.active && Math.hypot(dx, dy) < 3) return;
      p.active = true;
      const s = scaleRef.current;
      if (s <= 0) return;
      const store = useSceneStore.getState();
      const src = store.sources[p.sourceId];
      if (!src || src.locked) return;
      if (p.mode === 'move') {
        store.updateSourceTransform(p.sourceId, {
          x: p.startTransform.x + dx / s,
          y: p.startTransform.y + dy / s,
        });
      } else {
        store.updateSourceTransform(p.sourceId, {
          width: Math.max(10, p.startTransform.width + dx / s),
          height: Math.max(10, p.startTransform.height + dy / s),
        });
      }
    };
    const onUp = () => {
      pointerRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const scene = scenes.find((s) => s.id === activeSceneId);

  const hitTest = (clientX: number, clientY: number): string | null => {
    if (!scene || scale <= 0) return null;
    const frame = frameRef.current;
    if (!frame) return null;
    const rect = frame.getBoundingClientRect();
    const canvasX = (clientX - rect.left - (frame.clientWidth - canvasWidth * scale) / 2) / scale;
    const canvasY = (clientY - rect.top - (frame.clientHeight - canvasHeight * scale) / 2) / scale;

    // Iterate in reverse (topmost source is last in the array).
    for (let i = scene.sourceIds.length - 1; i >= 0; i--) {
      const id = scene.sourceIds[i];
      const src = sources[id];
      if (!src || !src.visible) continue;
      const t = src.transform;
      if (canvasX >= t.x && canvasX <= t.x + t.width && canvasY >= t.y && canvasY <= t.y + t.height) {
        return id;
      }
    }
    return null;
  };

  const onBegin = (
    e: React.MouseEvent,
    sourceId: string,
    mode: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const store = useSceneStore.getState();
    const src = store.sources[sourceId];
    if (!src || src.locked) return;
    if (!store.selectedSourceIds.includes(sourceId)) store.setSelectedSources([sourceId]);
    pointerRef.current = {
      mode,
      sourceId,
      startMouse: { x: e.clientX, y: e.clientY },
      startTransform: { ...src.transform },
      active: false,
    };
  };

  const onFramePointerDown = (e: React.MouseEvent) => {
    const hitId = hitTest(e.clientX, e.clientY);
    const store = useSceneStore.getState();
    if (hitId) {
      const src = store.sources[hitId];
      if (src?.locked) {
        store.setSelectedSources([hitId]);
      } else if (src) {
        onBegin(e, hitId, 'move');
      }
    } else {
      store.setSelectedSources([]);
    }
  };

  const onFrameContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const id = hitTest(e.clientX, e.clientY);
    if (id) {
      const store = useSceneStore.getState();
      if (!store.selectedSourceIds.includes(id)) store.setSelectedSources([id]);
      setContextSourceId(id);
    } else {
      setContextSourceId(null);
    }
    setPosition({ x: e.clientX, y: e.clientY });
  };

  const transformMenuItems = (id: string): ContextMenuItem[] => {
    const ctx = useSceneStore.getState();
    const src = ctx.sources[id];
    if (!src) return [];
    const tt = src.transform;
    const update = (patch: Partial<Transform>) => ctx.updateSourceTransform(id, patch);
    const cw = canvasWidth;
    const ch = canvasHeight;
    return [
      {
        id: 'fit',
        label: 'Fit to Canvas',
        action: () =>
          update({
            x: 0,
            y: 0,
            width: cw,
            height: ch,
          }),
      },
      {
        id: 'center-h',
        label: 'Center Horizontally',
        action: () => update({ x: Math.round((cw - tt.width) / 2) }),
      },
      {
        id: 'center-v',
        label: 'Center Vertically',
        action: () => update({ y: Math.round((ch - tt.height) / 2) }),
      },
      {
        id: 'center',
        label: 'Center',
        action: () =>
          update({
            x: Math.round((cw - tt.width) / 2),
            y: Math.round((ch - tt.height) / 2),
          }),
      },
      { id: 'sep1', separator: true },
      {
        id: 'lock',
        label: src.locked ? 'Unlock' : 'Lock',
        action: () => ctx.toggleLocked(id),
      },
      {
        id: 'visible',
        label: src.visible ? 'Hide' : 'Show',
        action: () => ctx.toggleVisible(id),
      },
      { id: 'sep2', separator: true },
      {
        id: 'remove',
        label: 'Remove',
        action: () => {
          removeSourceMedia(id);
          ctx.removeSource(id);
        },
      },
    ];
  };

  const startResize = (e: React.MouseEvent, sourceId: string) => {
    onBegin(e, sourceId, 'resize');
  };

  return (
    <div className="preview">
      <div className="preview-frame" ref={frameRef} onMouseDown={onFramePointerDown} onContextMenu={onFrameContextMenu}>
        <canvas ref={canvasRef} className="preview-canvas" tabIndex={0} />
        {scale > 0 &&
          selectedSourceIds.map((id) => {
            const src = sources[id];
            if (!src) return null;
            const t = src.transform;
            const style = {
              left: t.x * scale,
              top: t.y * scale,
              width: t.width * scale,
              height: t.height * scale,
            };
            return (
              <div
                key={id}
                className="preview-box"
                style={style}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onBegin(e, id, 'move');
                }}
              >
                <span className="preview-box-label">
                  <Icon name="cursor" size={10} />
                  {src.name}
                </span>
                <div
                  className="preview-resize"
                  onMouseDown={(e) => startResize(e, id)}
                  title="Resize"
                />
              </div>
            );
          })}
      </div>
      <div className="preview-toolbar">
        <div className="preview-title">Preview</div>
        <div className="preview-info">
          <span className="preview-note">
            {canvasWidth}×{canvasHeight}
          </span>
        </div>
      </div>

      {position && contextSourceId && (
        <ContextMenu
          position={position}
          items={transformMenuItems(contextSourceId)}
          onClose={() => {
            setPosition(null);
            setContextSourceId(null);
          }}
        />
      )}
    </div>
  );
}