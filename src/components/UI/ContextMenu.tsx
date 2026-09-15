import { useEffect, useRef } from 'react';
import { placeMenuWithinViewport, type ContextMenuPosition } from '../../hooks/useMenuPosition';
import { Icon, type IconName } from './Icons';
import './contextmenu.css';

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: IconName;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
}

export function ContextMenu({ position, items, onClose }: { position: ContextMenuPosition; items: ContextMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { left, top } = placeMenuWithinViewport(el, position.x, position.y);
    el.style.left = left;
    el.style.top = top;
  }, [position]);

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item) =>
        item.separator ? (
          <div key={item.id} className="ctx-rule" />
        ) : (
          <button
            key={item.id}
            className="ctx-item"
            disabled={item.disabled}
            onClick={() => {
              item.action?.();
              onClose();
            }}
          >
            <span className="ctx-item-icon">{item.icon && <Icon name={item.icon} size={14} />}</span>
            <span className="ctx-item-label">{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}