import { Button } from '../UI/Button';
import { Icon } from '../UI/Icons';
import { useRecorderStore } from '../../stores/recorderStore';
import './controls.css';

export interface ControlsPanelProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPause: () => void;
  onResume: () => void;
  onOpenSettings: () => void;
}

export function ControlsPanel({
  onStartRecording,
  onStopRecording,
  onPause,
  onResume,
  onOpenSettings,
}: ControlsPanelProps) {
  const state = useRecorderStore((s) => s.state);

  return (
    <div className="controls">
      {state === 'recording' ? (
        <>
          <Button variant="danger" className="controls-record" onClick={onStopRecording}>
            <Icon name="record" size={14} />
            Stop Recording
          </Button>
          <Button variant="default" onClick={onPause}>
            <Icon name="pause" size={13} />
            Pause
          </Button>
        </>
      ) : state === 'paused' ? (
        <>
          <Button variant="danger" className="controls-record" onClick={onStopRecording}>
            <Icon name="record" size={14} />
            Stop Recording
          </Button>
          <Button variant="default" onClick={onResume}>
            <Icon name="expand" size={13} />
            Resume
          </Button>
        </>
      ) : (
        <Button variant="primary" className="controls-record" onClick={onStartRecording}>
          <Icon name="record" size={14} />
          Start Recording
        </Button>
      )}

      <Button variant="default" onClick={onOpenSettings}>
        <Icon name="settings" size={13} />
        Settings
      </Button>

      <div className="controls-decorative">
        <span className="controls-label">Profile</span>
        <select className="controls-select" disabled>
          <option>Untitled</option>
        </select>
        <span className="controls-label">Scene Collection</span>
        <select className="controls-select" disabled>
          <option>Untitled</option>
        </select>
      </div>
    </div>
  );
}