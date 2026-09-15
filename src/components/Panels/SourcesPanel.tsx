import { useState, type MouseEvent } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import {
  removeSourceMedia,
} from '../../engine/sourceMedia';
import { SOURCE_REGISTRY, type SourceType } from '../../types';
import { createSourceForType } from '../../engine/sources/createSource';
import { Icon, type IconName } from '../UI/Icons';
import { ContextMenu, type ContextMenuItem } from '../UI/ContextMenu';
import { useMenuPosition } from '../../hooks/useMenuPosition';
import { AddSourceDialog } from '../Dialogs/AddSourceDialog';
import { FiltersDialog } from '../Dialogs/FiltersDialog';
import { SourcePropertiesDialog } from '../Dialogs/SourcePropertiesDialog';
import './lists.css';

const TYPE_ICON: Record<SourceType, IconName> = {
  screen: 'screen',
  camera: 'camera',
  image: 'image',
  text: 'text',
  color: 'color',
  group: 'group',
};

export function SourcesPanel() {
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const scenes = useSceneStore((s) => s.scenes);
  const sources = useSceneStore((s) => s.sources);
  const selectedSourceIds = useSceneStore((s) => s.selectedSourceIds);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [contextSourceId, setContextSourceId] = useState<string | null>(null);
  const [filtersSourceId, setFiltersSourceId] = useState<string | null>(null);
  const [propertiesSourceId, setPropertiesSourceId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { position, setPosition } = useMenuPosition();

  const scene = scenes.find((s) => s.id === activeSceneId);
  const sceneSources = scene ? scene.sourceIds.map((id) => sources[id]).filter(Boolean) : [];

  const view = useSceneStore.getState();

  const handleAddSource = async (name: SourceType) => {
    setDialogOpen(false);
    const created = await createSourceForType(name);
    if (!created) return;
    useSceneStore.getState().addSource(created);
  };

  const handleRemoveSelected = () => {
    selectedSourceIds.forEach((id) => {
      removeSourceMedia(id);
      view.removeSource(id);
    });
  };

  const contextItems = (sourceId: string): ContextMenuItem[] => [
    {
      id: 'props',
      label: 'Properties',
      action: () => {
        view.setSelectedSources([sourceId]);
        const type = sources[sourceId]?.type;
        if (type === 'text' || type === 'color') setPropertiesSourceId(sourceId);
      },
    },
    {
      id: 'filters',
      label: 'Filters',
      action: () => setFiltersSourceId(sourceId),
    },
    { id: 'sep2', separator: true },
    {
      id: 'visible',
      label: 'Visible',
      action: () => view.toggleVisible(sourceId),
    },
    {
      id: 'lock',
      label: 'Lock',
      action: () => view.toggleLocked(sourceId),
    },
    { id: 'sep', separator: true },
    {
      id: 'rename',
      label: 'Rename',
      action: () => {
        setEditingId(sourceId);
        setEditName(sources[sourceId]?.name ?? '');
      },
    },
    {
      id: 'remove',
      label: 'Remove',
      action: () => {
        removeSourceMedia(sourceId);
        view.removeSource(sourceId);
      },
    },
  ];

  const handleRowContext = (e: MouseEvent, sourceId: string) => {
    e.preventDefault();
    if (!selectedSourceIds.includes(sourceId)) view.setSelectedSources([sourceId]);
    setContextSourceId(sourceId);
    setPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div className="obs-list">
        {sceneSources.length === 0 && <div className="obs-list-empty">No sources</div>}
        {sceneSources.map((src, index) => (
          <div
            key={src.id}
            className={`obs-list-item ${selectedSourceIds.includes(src.id) ? 'obs-list-item--active' : ''} ${
              src.muted ? 'obs-list-item--muted' : ''
            }`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) view.moveSource(dragIndex, index);
              setDragIndex(null);
            }}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                view.setSelectedSources(
                  selectedSourceIds.includes(src.id)
                    ? selectedSourceIds.filter((id) => id !== src.id)
                    : [...selectedSourceIds, src.id]
                );
              } else {
                view.setSelectedSources([src.id]);
              }
            }}
            onContextMenu={(e) => handleRowContext(e, src.id)}
          >
            <span className="obs-list-type">
              <Icon name={TYPE_ICON[src.type]} size={13} />
            </span>
            {editingId === src.id ? (
              <input
                className="obs-list-edit"
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  view.renameSource(src.id, editName || src.name);
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    view.renameSource(src.id, editName || src.name);
                    setEditingId(null);
                  }
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span className="obs-list-label">{src.name}</span>
            )}
            <button
              className="obs-list-eye"
              title={src.visible ? 'Hide source' : 'Show source'}
              onClick={(e) => {
                e.stopPropagation();
                view.toggleVisible(src.id);
              }}
            >
              <Icon name={src.visible ? 'eye' : 'eyeOff'} size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="dock-toolbar">
        <button className="tool-btn" title="Add source" onClick={() => setDialogOpen(true)}>
          <Icon name="plus" />
        </button>
        <button className="tool-btn" title="Remove source" disabled={selectedSourceIds.length === 0} onClick={handleRemoveSelected}>
          <Icon name="minus" />
        </button>
        <div className="tool-separator" />
        <button
          className="tool-btn"
          title="Filters"
          disabled={selectedSourceIds.length !== 1}
          onClick={() => selectedSourceIds[0] && setFiltersSourceId(selectedSourceIds[0])}
        >
          <Icon name="filter" />
        </button>
        <button
          className="tool-btn"
          title="Properties"
          disabled={selectedSourceIds.length !== 1}
          onClick={() => selectedSourceIds[0] && setPropertiesSourceId(selectedSourceIds[0])}
        >
          <Icon name="settings" />
        </button>
        <div className="tool-separator" />
        <button
          className="tool-btn"
          title="Move up"
          disabled={sceneSources.length < 2 || !scene}
          onClick={() => {
            if (!scene) return;
            const idx = scene.sourceIds.indexOf(selectedSourceIds[0]);
            if (idx > 0) view.moveSource(idx, idx - 1);
          }}
        >
          <Icon name="up" />
        </button>
        <button
          className="tool-btn"
          title="Move down"
          disabled={sceneSources.length < 2 || !scene}
          onClick={() => {
            if (!scene) return;
            const idx = scene.sourceIds.indexOf(selectedSourceIds[0]);
            if (idx >= 0 && idx < scene.sourceIds.length - 1) view.moveSource(idx, idx + 1);
          }}
        >
          <Icon name="down" />
        </button>
      </div>

      {dialogOpen && (
        <AddSourceDialog
          shownTypes={SOURCE_REGISTRY.filter((t) => t.type !== 'group')}
          onClose={() => setDialogOpen(false)}
          onSelect={(t) => void handleAddSource(t)}
        />
      )}

      {filtersSourceId && (
        <FiltersDialog sourceId={filtersSourceId} onClose={() => setFiltersSourceId(null)} />
      )}

      {propertiesSourceId && (
        <SourcePropertiesDialog sourceId={propertiesSourceId} onClose={() => setPropertiesSourceId(null)} />
      )}

      {position && contextSourceId && (
        <ContextMenu
          position={position}
          items={contextItems(contextSourceId)}
          onClose={() => {
            setPosition(null);
            setContextSourceId(null);
          }}
        />
      )}
    </>
  );
}