import type { ReactNode } from 'react';
import { Icon } from '../UI/Icons';
import './dock.css';

export interface DockProps {
  title: string;
  children: ReactNode;
  toolbar?: ReactNode;
  onClose?: () => void;
  className?: string;
  testId?: string;
}

export function Dock({ title, children, toolbar, onClose, className = '', testId }: DockProps) {
  return (
    <section className={`dock ${className}`} data-testid={testId}>
      <header className="dock-titlebar">
        <span className="dock-title">{title}</span>
        {onClose && (
          <button className="dock-action" onClick={onClose} title="Close panel">
            <Icon name="close" size={14} />
          </button>
        )}
      </header>
      <div className="dock-body">{children}</div>
      {toolbar && <div className="dock-toolbar">{toolbar}</div>}
    </section>
  );
}