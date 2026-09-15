import { useSettingsStore } from '../../stores/settingsStore';
import { DEFAULT_RESOLUTIONS } from '../../types';
import { Select, NumberInput } from '../UI/Select';
import { Button } from '../UI/Button';
import { Icon } from '../UI/Icons';
import './settings.css';

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const s = useSettingsStore();
  const view = useSettingsStore.getState();

  const resOptions = Object.entries(DEFAULT_RESOLUTIONS).map(([label, { width, height }]) => ({
    value: `${width}x${height}`,
    label: `${label} (${width}×${height})`,
  }));

  const currentRes = `${s.canvasWidth}x${s.canvasHeight}`;
  const hasCustomRes = !resOptions.some((o) => o.value === currentRes);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card modal-card--wide" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-titlebar">
          <span className="modal-title">
            <Icon name="settings" size={14} /> Settings
          </span>
          <button className="modal-close" onClick={onClose} title="Close">
            <Icon name="close" size={14} />
          </button>
        </header>

        <div className="modal-body">
          <section className="settings-section">
            <h3 className="settings-heading">Video</h3>
            <div className="settings-grid">
              <div className="form-field">
                <label className="form-label">Base (Canvas) Resolution</label>
                <Select
                  options={[...(hasCustomRes ? [{ value: currentRes, label: `Custom (${currentRes})` }] : []), ...resOptions]}
                  value={currentRes}
                  onChange={(e) => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    if (w && h) view.setResolution(w, h);
                  }}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Common FPS</label>
                <Select
                  value={String(s.output.fps)}
                  options={[
                    { value: '15', label: '15' },
                    { value: '24', label: '24' },
                    { value: '30', label: '30' },
                    { value: '60', label: '60' },
                  ]}
                  onChange={(e) => view.setFps(Number(e.target.value))}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Recording Format</label>
                <Select
                  value={s.output.format}
                  options={[
                    { value: 'webm', label: 'WebM' },
                    { value: 'mp4', label: 'MP4' },
                  ]}
                  onChange={(e) => view.setFormat(e.target.value as 'webm' | 'mp4')}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Video Bitrate (kbps)</label>
                <NumberInput
                  min={1000}
                  step={500}
                  value={Math.round(s.output.videoBitrate / 1000)}
                  onChange={(e) => view.setBitrate(Number(e.target.value) * 1000, s.output.audioBitrate)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Audio Bitrate (kbps)</label>
                <NumberInput
                  min={32}
                  step={16}
                  value={Math.round(s.output.audioBitrate / 1000)}
                  onChange={(e) => view.setBitrate(s.output.videoBitrate, Number(e.target.value) * 1000)}
                />
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="settings-heading">Transitions</h3>
            <div className="settings-grid">
              <div className="form-field">
                <label className="form-label">Type</label>
                <Select
                  value={s.transitionType}
                  options={[
                    { value: 'fade', label: 'Fade' },
                    { value: 'cut', label: 'Cut' },
                  ]}
                  onChange={(e) => view.setTransitionType(e.target.value as 'fade' | 'cut')}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Duration (ms)</label>
                <NumberInput
                  min={0}
                  max={5000}
                  step={100}
                  value={s.transitionDuration}
                  onChange={(e) => view.setTransitionDuration(Math.max(0, Math.min(5000, Number(e.target.value))))}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}