import { useEffect, useRef, useState } from 'react';
import './menubar.css';

interface MenuItem {
  label?: string;
  action?: () => void;
  checked?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface MenuDef {
  label: string;
  items: MenuItem[];
}

export function MenuBar() {
  const [open, setOpen] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [{ label: 'Exit', action: () => window.close() }],
    },
    { label: 'Edit', items: [{ label: 'Undo', disabled: true }, { label: 'Redo', disabled: true }] },
    {
      label: 'View',
      items: [
        {
          label: 'Fullscreen Interface (F11)',
          action: () => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void document.documentElement.requestFullscreen();
          },
        },
        {
          label: 'Audio Monitoring',
          disabled: true,
        },
      ],
    },
    {
      label: 'Docks',
      items: [{ label: 'Reset Docks', disabled: true }, { label: 'Lock Docks', disabled: true }],
    },
    {
      label: 'Profile',
      items: [{ label: 'New', disabled: true }, { label: 'Import', disabled: true }],
    },
    {
      label: 'Tools',
      items: [{ label: 'Stats', disabled: true }, { label: 'Auto-Configuration Wizard', disabled: true }],
    },
    {
      label: 'Help',
      items: [
        {
          label: 'About WebOBS',
          action: () => window.alert('WebOBS Studio — OBS reimagined in your browser. ✦'),
        },
      ],
    },
  ];

  return (
    <div className="menubar" ref={barRef} onMouseLeave={() => setOpen(null)}>
      {menus.map((menu) => (
        <div key={menu.label} className="menubar-item-wrap">
          <button
            className={`menubar-item ${open === menu.label ? 'menubar-item--open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(open === menu.label ? null : menu.label);
            }}
          >
            {menu.label}
          </button>
          {open === menu.label && (
            <div className="menu-dropdown">
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} className="menu-separator" />
                ) : (
                  <button
                    key={i}
                    className="menu-item"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.action?.();
                      setOpen(null);
                    }}
                  >
                    {item.checked !== undefined && (
                      <span className="menu-check">{item.checked ? '✓' : ''}</span>
                    )}
                    <span className="menu-label">{item.label ?? ''}</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
      <div className="menubar-spacer" />
      <span className="menubar-title">WebOBS Studio</span>
    </div>
  );
}