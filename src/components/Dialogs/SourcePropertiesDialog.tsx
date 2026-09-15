import { useState } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import {
  getSourceMedia,
  registerSourceMedia,
  markCanvasDirty,
} from '../../engine/sourceMedia';
import {
  renderTextCanvas,
  createColorCanvas,
  DEFAULT_TEXT_OPTIONS,
} from '../../engine/sources/factory';
import { Button } from '../UI/Button';
import { Slider } from '../UI/Slider';
import { Icon } from '../UI/Icons';
import './dialog.css';

interface LocalTextOptions {
  text: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  bold: boolean;
  outline: boolean;
}

export function SourcePropertiesDialog({ sourceId, onClose }: { sourceId: string; onClose: () => void }) {
  const source = useSceneStore((s) => s.sources[sourceId]);

  const media = source ? getSourceMedia(sourceId) : undefined;

  const [text, setText] = useState<LocalTextOptions>({
    text: source?.textOptions?.text ?? '',
    fontSize: source?.textOptions?.fontSize ?? DEFAULT_TEXT_OPTIONS.fontSize ?? 48,
    color: source?.textOptions?.color ?? '#ffffff',
    backgroundColor: source?.textOptions?.backgroundColor ?? 'transparent',
    bold: source?.textOptions?.bold ?? false,
    outline: source?.textOptions?.outline ?? true,
  });

  const [bgColor, setBgColor] = useState(source?.color ?? '#000000');

  if (!source) return null;

  const applyText = () => {
    const options = {
      ...DEFAULT_TEXT_OPTIONS,
      text: text.text,
      fontSize: text.fontSize,
      color: text.color,
      backgroundColor: text.backgroundColor,
      bold: text.bold,
      outline: text.outline,
    };
    const canvas = document.createElement('canvas');
    canvas.id = sourceId;
    renderTextCanvas(canvas, options);
    registerSourceMedia(sourceId, {
      element: canvas,
      kind: 'canvas',
      width: canvas.width,
      height: canvas.height,
    });
    markCanvasDirty(sourceId);
    useSceneStore.getState().updateSourceMeta(sourceId, { textOptions: options });
  };

  const applyColor = () => {
    const resolved = bgColor.startsWith('#') ? bgColor : `#${bgColor}`;
    const canvas = createColorCanvas(resolved);
    canvas.id = sourceId;
    registerSourceMedia(sourceId, {
      element: canvas,
      kind: 'canvas',
      width: canvas.width,
      height: canvas.height,
    });
    markCanvasDirty(sourceId);
    useSceneStore.getState().updateSourceMeta(sourceId, { color: resolved });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-titlebar">
          <span className="modal-title">
            <Icon name="settings" size={14} /> Properties — {source.name}
          </span>
          <button className="modal-close" onClick={onClose} title="Close">
            <Icon name="close" size={14} />
          </button>
        </header>

        <div className="modal-body">
          {source.type === 'text' && (
            <>
              <div className="form-field">
                <label className="form-label">Text</label>
                <textarea
                  className="src-textarea"
                  rows={4}
                  value={text.text}
                  onChange={(e) => setText((t) => ({ ...t, text: e.target.value }))}
                  placeholder="Enter text…"
                />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Font Size</label>
                  <Slider
                    min={12}
                    max={240}
                    step={1}
                    value={text.fontSize}
                    onValueChange={(v) => setText((t) => ({ ...t, fontSize: v }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Color</label>
                  <input
                    type="color"
                    className="src-color"
                    value={text.color}
                    onChange={(e) => setText((t) => ({ ...t, color: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={text.bold}
                    onChange={(e) => setText((t) => ({ ...t, bold: e.target.checked }))}
                  />
                  Bold
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={text.outline}
                    onChange={(e) => setText((t) => ({ ...t, outline: e.target.checked }))}
                  />
                  Outline
                </label>
              </div>
            </>
          )}

          {source.type === 'color' && (
            <div className="form-field">
              <label className="form-label">Background Color</label>
              <input
                type="color"
                className="src-color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
              />
            </div>
          )}

          {source.type !== 'text' && source.type !== 'color' && (
            <p className="src-info">
              {media
                ? `${source.name} — ${media.width}×${media.height} (${media.kind})`
                : `${source.name} — capture source`}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (source.type === 'text') applyText();
              if (source.type === 'color') applyColor();
              onClose();
            }}
            disabled={source.type !== 'text' && source.type !== 'color'}
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}