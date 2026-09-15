import type { ActivationStatus } from '../hooks/useAppInit';
import type { ResourceState } from '../types';
import './splash.css';

const RESOURCE_LABELS: { key: keyof ActivationStatus; label: string; icon: string }[] = [
  { key: 'screen', label: 'Display Capture', icon: '🖥️' },
  { key: 'camera', label: 'Video Capture', icon: '📷' },
  { key: 'mic', label: 'Microphone', icon: '🎙️' },
];

const stateText: Record<ResourceState, string> = {
  uninitialized: 'Waiting',
  activating: 'Starting…',
  active: 'Active',
  error: 'Unavailable',
};

export interface SplashScreenProps {
  status: ActivationStatus;
  onStart: () => void;
}

export function SplashScreen({ status, onStart }: SplashScreenProps) {
  return (
    <div className="splash">
      <div className="splash-card">
        <div className="splash-logo">
          <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
            <rect x="4" y="10" width="56" height="36" rx="4" fill="#284CB8" />
            <rect x="10" y="16" width="44" height="24" rx="2" fill="#13141A" />
            <rect x="13" y="19" width="38" height="18" rx="1" fill="#3C404D" />
            <rect x="13" y="19" width="19" height="10" fill="#1D1F26" />
            <circle cx="48" cy="18" r="3" fill="#E33B57" />
            <rect x="20" y="46" width="24" height="4" rx="2" fill="#3C404D" />
            <rect x="12" y="50" width="40" height="6" rx="3" fill="#464B59" />
          </svg>
        </div>
        <h1 className="splash-title">WebOBS Studio</h1>
        <p className="splash-subtitle">Open Broadcaster Software — in your browser</p>

        <div className="splash-status-list">
          {RESOURCE_LABELS.map(({ key, label, icon }) => {
            const state = status[key] as ResourceState;
            return (
              <div key={key} className={`splash-resource splash-resource--${state}`}>
                <span className="splash-resource-icon">{icon}</span>
                <span className="splash-resource-label">{label}</span>
                <span className="splash-resource-state">
                  <span className={`status-dot status-dot--${state}`} />
                  {stateText[state]}
                </span>
              </div>
            );
          })}
        </div>

        <p className="splash-message">{status.message}</p>

        <button className="splash-start" onClick={onStart}>
          Start Studio
        </button>

        <p className="splash-hint">
          Your browser will ask for screen, camera and microphone access. All recording happens on
          your device — nothing is uploaded.
        </p>
      </div>
    </div>
  );
}