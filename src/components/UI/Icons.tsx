import type { CSSProperties } from 'react';

export type IconName =
  | 'plus'
  | 'minus'
  | 'up'
  | 'down'
  | 'close'
  | 'popout'
  | 'eye'
  | 'eyeOff'
  | 'lock'
  | 'unlock'
  | 'filter'
  | 'settings'
  | 'camera'
  | 'microphone'
  | 'screen'
  | 'image'
  | 'text'
  | 'color'
  | 'window'
  | 'group'
  | 'scene'
  | 'record'
  | 'pause'
  | 'save'
  | 'network'
  | 'speaker'
  | 'muted'
  | 'dropped'
  | 'cpu'
  | 'fps'
  | 'dots'
  | 'expand'
  | 'collapse'
  | 'cursor'
  | 'clock'
  | 'zoom'
  | 'description';

const PATHS: Record<IconName, string> = {
  plus: 'M8 3v10M3 8h10',
  minus: 'M3 8h10',
  up: 'M4 10l4-4 4 4',
  down: 'M4 6l4 4 4-4',
  close: 'M4 4l8 8M12 4l-8 8',
  popout: 'M14 3v8M14 3H6M14 3l-5 5M14 11v2H3V3h2',
  eye: 'M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4zM8 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  eyeOff: 'M2 8s1.2-2.4 3.2-3.4M6.6 3.8A5.7 5.7 0 0114 8a7 7 0 01-.5 1M2 8a7 7 0 006 3 6 6 0 003-.7M11.6 5.8L11.6 5.8M2 2l12 12',
  lock: 'M4 8h8v6H4zM6 8V6a2 2 0 014 0v2',
  unlock: 'M4 8h12v6H4zM10 8V6a2 2 0 014 0',
  filter: 'M2 3h12v2l-4 4v4l-4 1V9L2 5z',
  settings: 'M8 4l.7 1.2a5 5 0 011.6 0L11 4a5 5 0 013 5.2l-1.2.7a5 5 0 010 1.6L14 12a5 5 0 01-3 5.2l-.7-1.2a5 5 0 01-1.6 0L8 17.2A5 5 0 015 12l1.2-.7a5 5 0 010-1.6L5 9A5 5 0 018 4z M8 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  camera: 'M2 5h3l1.5-2h3L11 5h3a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V5z M10 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  microphone: 'M4 6v2a4 4 0 008 0V6a4 4 0 00-8 0z M2 7v1a6 6 0 0012 0V7 M8 14v2M6 16h4',
  screen: 'M2 3h12v9H2zM5 14h6M8 12v2',
  image: 'M2 3h12v10H2z M4.5 8.5L7 6l2.5 2.5L11 7l3 3v2H2V8z M5 6a1 1 0 100-2 1 1 0 000 2z',
  text: 'M3 4h10v2M8 4v9M5 13h6',
  color: 'M8 13a5 5 0 100-10 5 5 0 000 10z M8 4v8',
  window: 'M2 3h12v10H2zM2 6h12',
  group: 'M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z',
  scene: 'M2 3h12v6H2zM4 11h4v2H4z M9 11h3v2H9z',
  record: 'M4 4h8a4 4 0 010 8H4a4 4 0 010-8z',
  pause: 'M5 4h2.5v8H5zM8.5 4H11v8H8.5z',
  save: 'M3 2h9l2 2v11H3zM7 2v4h4V2M4 8h8v6H4z',
  network: 'M2 12a6 6 0 0112 0M5 12a3 3 0 016 0M8 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  speaker: 'M3 6h3l3-3v10l-3-3H3zM11 6a3 3 0 010 6M12.5 4.5a5 5 0 010 7',
  muted: 'M3 6h3l3-3v10l-3-3H3zM11 6l4 4m0-4l-4 4',
  dropped: 'M8 3l6 9H2zM2 14h12M10 14v2M6 14v2',
  cpu: 'M6 3v2M10 3v2M6 11v2M3 6h2M3 10h2M11 6h2M11 10h2M5 5h6v6H5z M5 12h6M12 5h1v6h-1M4 5h1v6H4M5 13h6v1H5z',
  fps: 'M2 4h4v8H2z M8 4h2v8H8z M12 4h2v8h-2z M15 4h1v8h-1z M2 13h14v1H2z M2 3h14v1H2z',
  dots: 'M7 4h2v2H7zM7 7h2v2H7zM7 10h2v2H7z',
  expand: 'M3 6l5 5 5-5',
  collapse: 'M3 10l5-5 5 5',
  cursor: 'M3 2l10 6-5 1-3 5z',
  clock: 'M8 2a6 6 0 100 12A6 6 0 008 2z M8 5v3l2 2',
  zoom: 'M6.5 11.5L3 15M3.5 6.5a3 3 0 100 6 3 3 0 000-6zM10 5h4M12 3v4',
  description: 'M4 2h5l3 3v9H4zM9 2v3h3',
};

export function Icon({
  name,
  size = 16,
  className,
  style,
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}