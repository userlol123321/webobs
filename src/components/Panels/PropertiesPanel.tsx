import { useSceneStore } from '../../stores/sceneStore';
import { NumberInput } from '../UI/Select';
import { Button } from '../UI/Button';
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

  const set = (field: keyof typeof t, value: number) =>
    view.updateSourceTransform(source.id, { [field]: value });

  return (
    <div className="properties">
      <div className="properties-header">
        <Icon name="settings" size={14} />
        <span>{source.name}</span>
      </div>
      <div className="properties-field">
        <span className="properties-label">X</span>
        <NumberInput step={1} value={t.x} onChange={(e) => set('x', Number(e.target.value))} />
      </div>
      <div className="properties-field">
        <span className="properties-label">Y</span>
        <NumberInput step={1} value={t.y} onChange={(e) => set('y', Number(e.target.value))} />
      </div>
      <div className="properties-field">
        <span className="properties-label">Width</span>
        <NumberInput step={1} value={t.width} onChange={(e) => set('width', Number(e.target.value))} />
      </div>
      <div className="properties-field">
        <span className="properties-label">Height</span>
        <NumberInput step={1} value={t.height} onChange={(e) => set('height', Number(e.target.value))} />
      </div>
      <div className="properties-field">
        <span className="properties-label">Rotation</span>
        <NumberInput step={0.1} value={t.rotation} unit="°" onChange={(e) => set('rotation', Number(e.target.value))} />
      </div>
      <div className="properties-title">Crop</div>
      <div className="properties-field">
        <span className="properties-label">Left</span>
        <NumberInput step={1} value={t.cropLeft} onChange={(e) => set('cropLeft', Number(e.target.value))} />
      </div>
      <div className="properties-field">
        <span className="properties-label">Top</span>
        <NumberInput step={1} value={t.cropTop} onChange={(e) => set('cropTop', Number(e.target.value))} />
      </div>
      <div className="properties-field">
        <span className="properties-label">Right</span>
        <NumberInput step={1} value={t.cropRight} onChange={(e) => set('cropRight', Number(e.target.value))} />
      </div>
      <div className="properties-field">
        <span className="properties-label">Bottom</span>
        <NumberInput step={1} value={t.cropBottom} onChange={(e) => set('cropBottom', Number(e.target.value))} />
      </div>
      <Button variant="ghost" className="properties-reset" title="Reset transform">
        Reset Transform
      </Button>
    </div>
  );
}