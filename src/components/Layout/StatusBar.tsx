import { useRecorderStore } from '../../stores/recorderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatTime, formatFileSize } from '../../utils/format-time';
import { Icon } from '../UI/Icons';
import './statusbar.css';

export function StatusBar() {
  const { state, elapsed, fileSize, droppedFrames, fps, cpu } = useRecorderStore();
  const { canvasWidth, canvasHeight } = useSettingsStore();

  const isRecording = state === 'recording' || state === 'paused';

  return (
    <div className="statusbar">
      <span className="statusbar-message">
        {state === 'recording' && '● Recording'}
        {state === 'paused' && 'Recording (paused)'}
        {state === 'idle' && 'Ready'}
      </span>

      {isRecording && (
        <>
          <span className="statusbar-item statusbar-rec">
            <Icon name="record" size={13} />
            {formatTime(elapsed)}
          </span>
          <span className="statusbar-item">
            <Icon name="save" size={13} />
            {formatFileSize(fileSize)}
          </span>
        </>
      )}

      {droppedFrames > 0 && (
        <span className="statusbar-item statusbar-warn">
          <Icon name="dropped" size={13} />
          {droppedFrames}
        </span>
      )}

      <span className="statusbar-item">
        <Icon name="cpu" size={13} />
        CPU: {cpu.toFixed(1)}%
      </span>
      <span className="statusbar-item">
        <Icon name="fps" size={13} />
        {fps} FPS
      </span>
      <span className="statusbar-item">
        {canvasWidth}×{canvasHeight}
      </span>
    </div>
  );
}