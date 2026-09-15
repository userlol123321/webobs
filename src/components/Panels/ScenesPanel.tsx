import { useState } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { Icon } from '../UI/Icons';
import { ContextMenu, type ContextMenuItem } from '../UI/ContextMenu';
import { useMenuPosition } from '../../hooks/useMenuPosition';
import './lists.css';

export function ScenesPanel() {
  const scenes = useSceneStore((s) => s.scenes);
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const { setActiveScene, addScene, removeScene, reorderScene, renameScene, duplicateScene } =
    useSceneStore.getState();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { position, setPosition } = useMenuPosition();

  const activeIndex = scenes.findIndex((s) => s.id === activeSceneId);

  const handleRenameCommit = (id: string) => {
    renameScene(id, editName.trim() || scenes.find((s) => s.id === id)?.name || 'Scene');
    setEditingId(null);
  };

  const contextItems: ContextMenuItem[] = [
    {
      id: 'rename',
      label: 'Rename',
      action: () => {
        const s = scenes.find((sc) => sc.id === activeSceneId);
        if (s) {
          setEditingId(s.id);
          setEditName(s.name);
        }
      },
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      action: () => activeSceneId && duplicateScene(activeSceneId),
    },
    {
      id: 'remove',
      label: 'Remove',
      action: () => activeSceneId && removeScene(activeSceneId),
    },
  ];

  return (
    <>
      <div className="obs-list">
        {scenes.length === 0 && <div className="obs-list-empty">No scenes</div>}
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className={`obs-list-item ${scene.id === activeSceneId ? 'obs-list-item--active' : ''}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) reorderScene(dragIndex, index);
              setDragIndex(null);
            }}
            onClick={() => setActiveScene(scene.id)}
            onDoubleClick={() => {
              setEditingId(scene.id);
              setEditName(scene.name);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setActiveScene(scene.id);
              setPosition({ x: e.clientX, y: e.clientY });
            }}
          >
            {editingId === scene.id ? (
              <input
                className="obs-list-edit"
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameCommit(scene.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameCommit(scene.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span className="obs-list-label">{scene.name}</span>
            )}
          </div>
        ))}
      </div>
      <div className="dock-toolbar">
        <button className="tool-btn" title="Add scene" onClick={() => addScene()}>
          <Icon name="plus" />
        </button>
        <button
          className="tool-btn"
          title="Remove scene"
          disabled={!activeSceneId}
          onClick={() => activeSceneId && removeScene(activeSceneId)}
        >
          <Icon name="minus" />
        </button>
        <div className="tool-separator" />
        <button
          className="tool-btn"
          title="Move scene up"
          disabled={activeIndex <= 0}
          onClick={() => activeIndex > 0 && reorderScene(activeIndex, activeIndex - 1)}
        >
          <Icon name="up" />
        </button>
        <button
          className="tool-btn"
          title="Move scene down"
          disabled={activeIndex < 0 || activeIndex >= scenes.length - 1}
          onClick={() => activeIndex >= 0 && activeIndex < scenes.length - 1 && reorderScene(activeIndex, activeIndex + 1)}
        >
          <Icon name="down" />
        </button>
      </div>

      {position && activeSceneId && (
        <ContextMenu position={position} items={contextItems} onClose={() => setPosition(null)} />
      )}
    </>
  );
}