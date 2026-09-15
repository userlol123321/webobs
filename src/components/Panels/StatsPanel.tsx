import { useRecorderStore } from '../../stores/recorderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAudioStore } from '../../stores/audioStore';
import './stats.css';

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ? 'stat-value--accent' : ''}`}>{value}</span>
    </div>
  );
}

export function StatsPanel() {
  const { fps, cpu, droppedFrames, fileSize, state } = useRecorderStore();
  const { canvasWidth, canvasHeight, output } = useSettingsStore();
  const channels = useAudioStore((s) => s.channels);

  const totalChannels = Object.keys(channels).length;
  const audioActive = Object.values(channels).filter((c) => c.hasLevels).length;

  return (
    <div className="stats">
      <StatRow label="CPU" value={`${cpu.toFixed(1)}%`} />
      <StatRow label="Frames" value={`${fps} FPS`} />
      <StatRow label="Canvas" value={`${canvasWidth} × ${canvasHeight}`} />
      <StatRow label="Output FPS" value={`${output.fps}`} />
      <StatRow label="Dropped Frames" value={`${droppedFrames}`} accent={droppedFrames > 0} />
      <StatRow label="Rec. Size" value={state === 'idle' ? '—' : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`} />
      <StatRow label="Audio Channels" value={`${audioActive} / ${totalChannels}`} accent={audioActive !== totalChannels} />
      <StatRow label="Format" value={output.format.toUpperCase()} />
    </div>
  );
}