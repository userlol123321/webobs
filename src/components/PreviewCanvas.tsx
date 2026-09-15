import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useSceneStore } from '../stores/sceneStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { Transform } from '../types';
import { Icon } from './UI/Icons';
import './preview.css';

interface DragState {
  mode: 'move' | 'resize';
  sourceId: string;
  startMouse: { x: number; y: number };
  startTransform: Transform;
}

export function PreviewCanvas({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const scenes = useSceneStore((s) => s.scenes);
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const sources = useSceneStore((s) => s.sources);
  const selectedSourceIds = useSceneStore((s) => s.selectedSourceIds);
  const { canvasWidth, canvasHeight } = useSettingsStore();

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  const dragRef = useRef<DragState | null>(null);
  const scaleRef = useRef(1);

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
      const drag = dragRef.current;
      if (!drag) return;
      const s = scaleRef.current;
      if (s <= 0) return;
      const dx = (e.clientX - drag.startMouse.x) / s;
      const dy = (e.clientY - drag.startMouse.y) / s;
      const store = useSceneStore.getState();
      const src = store.sources[drag.sourceId];
      if (!src || src.locked) return;
      if (drag.mode === 'move') {
        store.updateSourceTransform(drag.sourceId, {
          x: drag.startTransform.x + dx,
          y: drag.startTransform.y + dy,
        });
      } else {
        store.updateSourceTransform(drag.sourceId, {
          width: Math.max(10, drag.startTransform.width + dx),
          height: Math.max(10, drag.startTransform.height + dy),
        });
      }
    };
    const onUp = () => {
      dragRef.current = null;
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
  const selected = scene ? scene.sourceIds.filter((id) => selectedSourceIds.includes(id)) : [];

  const startDrag = (
    e: React.MouseEvent,
    sourceId: string,
    mode: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const store = useSceneStore.getState();
    const src = store.sources[sourceId];
    if (!src || src.locked) return;
    // First interaction selects the source instead of dragging it, so a
    // stray click never yanks the box (or a fullscreen background) around.
    if (mode === 'move' && !store.selectedSourceIds.includes(sourceId)) {
      store.setSelectedSources([sourceId]);
      return;
    }
    if (!store.selectedSourceIds.includes(sourceId)) store.setSelectedSources([sourceId]);
    dragRef.current = {
      mode,
      sourceId,
      startMouse: { x: e.clientX, y: e.clientY },
      startTransform: { ...src.transform },
    };
  };

  const onFramePointerDown = (e: React.MouseEvent) => {
    // Clicking empty preview space clears the selection (OBS behavior).
    if (e.target === e.currentTarget) {
      useSceneStore.getState().setSelectedSources([]);
    }
  };

  return (
    <div className="preview">
      <div className="preview-frame" ref={frameRef} onMouseDown={onFramePointerDown}>
        <canvas ref={canvasRef} className="preview-canvas" tabIndex={0} />
        {scale > 0 &&
          selected.map((id) => {
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
                onMouseDown={(e) => startDrag(e, id, 'move')}
              >
                <span className="preview-box-label">
                  <Icon name="cursor" size={10} />
                  {src.name}
                </span>
                <div
                  className="preview-resize"
                  onMouseDown={(e) => startDrag(e, id, 'resize')}
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
    </div>
  );
}