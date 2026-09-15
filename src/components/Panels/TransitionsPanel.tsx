import { useSettingsStore } from '../../stores/settingsStore';
import { Icon } from '../UI/Icons';
import './transitions.css';

export function TransitionsPanel() {
  const { transitionDuration, setTransitionDuration } = useSettingsStore();

  return (
    <div className="transitions">
      <div className="transitions-title">Quick Transitions</div>
      <div className="transitions-list">
        <div className="transitions-row">
          <div className="transitions-row-label">
            <Icon name="expand" size={13} />
            <span>Cut</span>
          </div>
          <button className="transitions-apply" title="Apply cut transition">
            <Icon name="expand" size={12} />
          </button>
          <input
            type="number"
            className="transitions-duration"
            value={0}
            disabled
            title="Duration is fixed for cuts"
          />
        </div>
        <div className="transitions-row">
          <div className="transitions-row-label">
            <Icon name="dots" size={13} />
            <span>Fade</span>
          </div>
          <button className="transitions-apply" title="Apply fade transition">
            <Icon name="expand" size={12} />
          </button>
          <input
            type="number"
            className="transitions-duration"
            min={0}
            max={5000}
            step={100}
            value={transitionDuration}
            onChange={(e) => setTransitionDuration(Math.max(0, Math.min(5000, Number(e.target.value))))}
            title="Fade duration (ms)"
          />
          <span className="transitions-ms">ms</span>
        </div>
      </div>
    </div>
  );
}