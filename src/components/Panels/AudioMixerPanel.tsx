import { useAudioStore, type AudioChannel } from '../../stores/audioStore';
import { getAudioMixer } from '../../engine/audio/AudioMixer';
import { Slider } from '../UI/Slider';
import { Icon } from '../UI/Icons';
import './mixer.css';

function Meter({ channel }: { channel: AudioChannel }) {
  const { meterLevel, meterDb } = channel;

  // Map linear level (0..1) to a fill between -48dB and 0dB, OBS-style.
  const db = meterDb === 0 ? -100 : meterDb;
  const fillPct = Math.max(0, Math.min(100, ((db + 48) / 48) * 100));

  return (
    <div className="meter">
      <span className="meter-db">{meterDb <= -90 ? '-∞' : `${Math.round(meterDb)}dB`}</span>
      <div className="meter-track">
        <div className="meter-fill-zone">
          <div className="meter-fill-seg meter-fill-red" style={{ height: `${Math.min(100, Math.max(0, fillPct - 75))}%` }} />
          <div className="meter-fill-seg meter-fill-yellow" style={{ height: `${Math.min(100, Math.max(0, fillPct - 45))}%` }} />
          <div className="meter-fill-seg meter-fill-green" style={{ height: `${Math.min(100, Math.max(0, fillPct))}%` }} />
        </div>
        <div className="meter-peak" style={{ bottom: `${Math.max(0, meterLevel)}%` }} />
      </div>
    </div>
  );
}

export function AudioMixerPanel() {
  const channels = useAudioStore((s) => s.channels);

  const channelIds = Object.keys(channels);

  return (
    <div className="mixer">
      {channelIds.length === 0 && <div className="mixer-empty">No audio sources</div>}
      {channelIds.map((id) => {
        const ch = channels[id];
        const mixer = getAudioMixer();
        return (
          <div key={id} className="mixer-channel">
            <Meter channel={ch} />
            <div className="mixer-controls">
              <button
                className={`mixer-mute ${ch.muted ? 'mixer-mute--off' : ''}`}
                title={ch.muted ? 'Unmute' : 'Mute'}
                onClick={() => {
                  mixer.setMuted(id, !ch.muted);
                  useAudioStore.getState().setMuted(id, !ch.muted);
                }}
              >
                <Icon name={ch.muted ? 'muted' : 'speaker'} size={14} />
              </button>
              <Slider
                className="mixer-volume"
                min={0}
                max={1}
                step={0.01}
                value={ch.volume}
                title="Volume"
                onValueChange={(v) => {
                  mixer.setVolume(id, v);
                  useAudioStore.getState().setVolume(id, v);
                }}
              />
            </div>
            <span className="mixer-name" title={ch.name}>
              {ch.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}