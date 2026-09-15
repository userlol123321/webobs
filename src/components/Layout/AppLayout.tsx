import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { MenuBar } from './MenuBar';
import { StatusBar } from './StatusBar';
import { Dock } from './Dock';
import { useCompositor } from '../../hooks/useCompositor';
import { useAudioMeters } from '../../hooks/useAudioMeters';
import { useRecorderManager } from '../../hooks/useRecorderManager';
import { useHotkeys, isRecordingActive } from '../../hooks/useHotkeys';
import { ResilientRecorder } from '../../engine/recorder/ResilientRecorder';
import { PreviewCanvas } from '../PreviewCanvas';
import { ScenesPanel } from '../Panels/ScenesPanel';
import { SourcesPanel } from '../Panels/SourcesPanel';
import { AudioMixerPanel } from '../Panels/AudioMixerPanel';
import { TransitionsPanel } from '../Panels/TransitionsPanel';
import { ControlsPanel } from '../Panels/ControlsPanel';
import { StatsPanel } from '../Panels/StatsPanel';
import { PropertiesPanel } from '../Panels/PropertiesPanel';
import { SettingsDialog } from '../Dialogs/SettingsDialog';
import { RecoveryDialog } from '../Dialogs/RecoveryDialog';
import './app-layout.css';

export function AppLayout() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null) as RefObject<HTMLCanvasElement | null>;

  const controller = useCompositor(canvasRef);
  useAudioMeters();
  const recorder = useRecorderManager(controller.getStream);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const toggleRecording = useCallback(() => {
    if (isRecordingActive()) void recorder.stop();
    else void recorder.start();
  }, [recorder]);

  useHotkeys({ toggleRecording });

  useEffect(() => {
    void ResilientRecorder.listIncompleteSessions().then((list) => {
      if (list.length > 0) setShowRecovery(true);
    });
  }, []);

  return (
    <div className="app-layout">
      <MenuBar />

      <div className="app-main">
        <aside className="app-left">
          <Dock title="Scenes">
            <ScenesPanel />
          </Dock>
          <Dock title="Sources">
            <SourcesPanel />
          </Dock>
        </aside>

        <PreviewCanvas canvasRef={canvasRef} />
      </div>

      <div className="app-bottom">
        <Dock title="Audio Mixer" className="dock--section">
          <AudioMixerPanel />
        </Dock>
        <Dock title="Transitions" className="dock--section dock--transitions">
          <TransitionsPanel />
        </Dock>
        <Dock title="Controls" className="dock--section dock--controls">
          <ControlsPanel
            onStartRecording={() => void recorder.start()}
            onStopRecording={() => void recorder.stop()}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </Dock>
        <Dock title="Stats" className="dock--section dock--stats">
          <StatsPanel />
        </Dock>
        <Dock title="Properties" className="dock--section dock--properties">
          <PropertiesPanel />
        </Dock>
      </div>

      <StatusBar />

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      {showRecovery && <RecoveryDialog onDone={() => setShowRecovery(false)} />}
    </div>
  );
}