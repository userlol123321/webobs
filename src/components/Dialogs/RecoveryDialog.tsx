import { useEffect, useState } from 'react';
import { ResilientRecorder } from '../../engine/recorder/ResilientRecorder';
import * as DB from '../../engine/recorder/RecordingDB';
import { downloadBlobAndRevoke } from '../../hooks/useRecorderManager';
import { Button } from '../UI/Button';
import { Icon } from '../UI/Icons';
import './recovery.css';

interface Incomplete {
  sessionId: string;
  startedAt: number;
  name: string;
  chunkCount: number;
}

export function RecoveryDialog({ onDone }: { onDone: () => void }) {
  const [sessions, setSessions] = useState<Incomplete[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void ResilientRecorder.listIncompleteSessions().then((list) => {
      setSessions(list);
      setLoaded(true);
    });
  }, []);

  const recover = async (s: Incomplete) => {
    setBusyId(s.sessionId);
    try {
      const rebuilt = await ResilientRecorder.rebuildFromChunks(s.sessionId);
      if (rebuilt) {
        downloadBlobAndRevoke(rebuilt.blob, rebuilt.name);
      }
      await ResilientRecorder.deleteStoredSession(s.sessionId);
      setSessions((prev) => prev.filter((x) => x.sessionId !== s.sessionId));
    } catch (err) {
      console.error('Recovery failed:', err);
    } finally {
      setBusyId(null);
    }
  };

  const discard = async (s: Incomplete) => {
    setBusyId(s.sessionId);
    await ResilientRecorder.deleteStoredSession(s.sessionId).catch(() => void 0);
    setSessions((prev) => prev.filter((x) => x.sessionId !== s.sessionId));
    setBusyId(null);
  };

  const discardAll = async () => {
    await DB.clearAllRecordings().catch(() => void 0);
    setSessions([]);
  };

  if (!loaded) {
    return (
      <div className="modal-backdrop">
        <div className="modal-card">
          <div className="recovery-loading">Checking for interrupted recordings…</div>
        </div>
      </div>
    );
  }

  if (loaded && sessions.length === 0) {
    // Nothing to recover; close silently.
    return null;
  }

  return (
    <div className="modal-backdrop" onMouseDown={onDone}>
      <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-titlebar">
          <span className="modal-title">
            <Icon name="dropped" size={14} /> Interrupted Recording
          </span>
          <button className="modal-close" onClick={onDone} title="Close">
            <Icon name="close" size={14} />
          </button>
        </header>
        <div className="modal-body">
          <p className="recovery-note">
            One or more recordings were cut short (network loss, background tab, or crash). Their
            chunks were still saved. Save them to your device or discard them.
          </p>
          <div className="recovery-list">
            {sessions.map((s) => (
              <div key={s.sessionId} className="recovery-item">
                <div className="recovery-info">
                  <span className="recovery-name" title={s.name}>
                    {s.name}
                  </span>
                  <span className="recovery-meta">
                    {s.chunkCount} chunk{s.chunkCount === 1 ? '' : 's'} ·{' '}
                    {new Date(s.startedAt).toLocaleString()}
                  </span>
                </div>
                <div className="recovery-actions">
                  <Button variant="primary" disabled={busyId !== null} onClick={() => void recover(s)}>
                    Save
                  </Button>
                  <Button variant="danger" disabled={busyId !== null} onClick={() => void discard(s)}>
                    Discard
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="ghost" onClick={onDone}>
            Dismiss
          </Button>
          <Button variant="danger" disabled={sessions.length === 0} onClick={() => void discardAll()}>
            Discard All
          </Button>
        </div>
      </div>
    </div>
  );
}