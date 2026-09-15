import { useSceneStore } from '../../stores/sceneStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { NumberInput } from '../UI/Select';
import { Icon } from '../UI/Icons';
import './properties.css';

export function PropertiesPanel() {
  const selected = useSceneStore((s) => s.selectedSourceIds);
  const sources = useSceneStore((s) => s.sources);
  const view = useSceneStore.getState();

  const source = selected.length === 1 ? sources[selected[0]] : undefined;

  if (!source) {
    return (
      <div className="properties-empty">
        <p>Select a source to edit its properties.</p>
      </div>
    );
  }

  const t = source.transform;
  const { canvasWidth, canvasHeight } = useSettingsStore.getState();

  const set = (field: keyof typeof t, value: number) =>
    view.updateSourceTransform(source.id, { [field]: value });

  const fitToCanvas = () =>
    view.updateSourceTransform(source.id, {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
    });

  const centerBoth = () =>
    view.updateSourceTransform(source.id, {
      x: Math.round((canvasWidth - t.width) / 2),
      y: Math.round((canvasHeight - t.height) / 2),
    });

  const centerHorizontally = () =>
    view.updateSourceTransform(source.id, { x: Math.round((canvasWidth - t.width) / 2) });

  const centerVertically = () =>
    view.updateSourceTransform(source.id, { y: Math.round((canvasHeight - t.height) / 2) });

  const resetTransform = () =>
    view.updateSourceTransform(source.id, {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      rotation: 0,
      cropLeft: 0,
      cropTop: 0,
      cropRight: 0,
      cropBottom: 0,
    });

  const toggleFlip = () =>
    view.updateSourceTransform(source.id, { flipX: !(t.flipX ?? false) });

  return (
    <div className="properties">
      <div className="properties-header">
        <Icon name="settings" size={14} />
        <span>{source.name}</span>
        <label className="properties-lock" title="Lock source">
          <input
            type="checkbox"
            checked={source.locked}
            onChange={() => view.toggleLocked(source.id)}
          />
          Lock
        </label>
      </div>

      <div className="properties-title">Transform</div>
      <div className="properties-grid">
        <span className="properties-label">X</span>
        <NumberInput step={1} value={t.x} onChange={(e) => set('x', Number(e.target.value))} />
        <span className="properties-label">Y</span>
        <NumberInput step={1} value={t.y} onChange={(e) => set('y', Number(e.target.value))} />
        <span className="properties-label">Width</span>
        <NumberInput step={1} value={t.width} onChange={(e) => set('width', Number(e.target.value))} />
        <span className="properties-label">Height</span>
        <NumberInput step={1} value={t.height} onChange={(e) => set('height', Number(e.target.value))} />
        <span className="properties-label">Rotation</span>
        <NumberInput step={0.1} value={t.rotation} unit="°" onChange={(e) => set('rotation', Number(e.target.value))} />
      </div>

      <div className="properties-title">Crop</div>
      <div className="properties-grid properties-grid--4">
        <span className="properties-label">Left</span>
        <NumberInput step={1} value={t.cropLeft} onChange={(e) => set('cropLeft', Number(e.target.value))} />
        <span className="properties-label">Top</span>
        <NumberInput step={1} value={t.cropTop} onChange={(e) => set('cropTop', Number(e.target.value))} />
        <span className="properties-label">Right</span>
        <NumberInput step={1} value={t.cropRight} onChange={(e) => set('cropRight', Number(e.target.value))} />
        <span className="properties-label">Bottom</span>
        <NumberInput step={1} value={t.cropBottom} onChange={(e) => set('cropBottom', Number(e.target.value))} />
      </div>

      <div className="properties-title">Quick Actions</div>
      <div className="properties-actions">
        <button className="properties-action" onClick={resetTransform} title="Reset transform to fit the canvas">
          Reset Transform
        </button>
        <button className="properties-action" onClick={fitToCanvas} title="Stretch to the full canvas size">
          Fit to Canvas
        </button>
        <button className="properties-action" onClick={centerHorizontally} title="Center horizontally at current size">
          Center H
        </button>
        <button className="properties-action" onClick={centerVertically} title="Center vertically at current size">
          Center V
        </button>
        <button className="properties-action" onClick={centerBoth} title="Center both axes at current size">
          Center Both
        </button>
        {source.type === 'screen' && (
          <button
            className={`properties-action ${t.flipX ? 'properties-action--active' : ''}`}
            onClick={toggleFlip}
            title="Mirror the screen capture left-to-right"
          >
            {t.flipX ? 'Flip: On' : 'Flip: Off'}
          </button>
        )}
      </div>

      {source.type === 'camera' && (
        <>
          <div className="properties-title">Webcam Position</div>
          <div className="properties-actions">
            {(['TL', 'TR', 'BL', 'BR'] as const).map((corner) => {
              const margin = 24;
              const positions: Record<string, { x: number; y: number }> = {
                TL: { x: margin, y: margin },
                TR: { x: canvasWidth - t.width - margin, y: margin },
                BL: { x: margin, y: canvasHeight - t.height - margin },
                BR: { x: canvasWidth - t.width - margin, y: canvasHeight - t.height - margin },
              };
              return (
                <button
                  key={corner}
                  className="properties-action"
                  onClick={() => view.updateSourceTransform(source.id, positions[corner])}
                  title={`Snap to ${corner} corner (24px margin)`}
                >
                  {corner}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}