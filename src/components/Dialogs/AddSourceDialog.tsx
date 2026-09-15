import type { SourceMetadata } from '../../types';
import { Icon, type IconName } from '../UI/Icons';
import './dialog.css';

const TYPE_ICON: Record<string, IconName> = {
  screen: 'screen',
  camera: 'camera',
  image: 'image',
  text: 'text',
  color: 'color',
};

export function AddSourceDialog({
  shownTypes,
  onClose,
  onSelect,
}: {
  shownTypes: SourceMetadata[];
  onClose: () => void;
  onSelect: (type: SourceMetadata['type']) => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-titlebar">
          <span className="modal-title">Add Source</span>
          <button className="modal-close" onClick={onClose} title="Close">
            <Icon name="close" size={14} />
          </button>
        </header>
        <div className="add-src-list">
          {shownTypes.map((t) => (
            <button key={t.type} className="add-src-item" onClick={() => onSelect(t.type)}>
              <span className="add-src-icon">
                <Icon name={TYPE_ICON[t.type] ?? 'scene'} size={16} />
              </span>
              <span className="add-src-info">
                <span className="add-src-label">{t.label}</span>
                <span className="add-src-desc">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}