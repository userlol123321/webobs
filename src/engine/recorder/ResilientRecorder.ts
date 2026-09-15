import { generateId } from '../../utils/generate-id';
import * as DB from './RecordingDB';

export const RECORDING_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=avc1',
  'video/webm',
  'video/mp4',
] as const;

export function pickSupportedMimeType(preferred?: string): string {
  if (preferred && MediaRecorder.isTypeSupported(preferred)) return preferred;
  for (const t of RECORDING_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export interface ResilientRecorderOptions {
  stream: MediaStream;
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  onSizeChange?: (bytes: number) => void;
  onStop?: () => void;
  onError?: (error: unknown) => void;
}

const DEFAULT_TIMESLICE_MS = 1000;

export class ResilientRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private sessionId = '';
  private sessionName = '';
  private chunkIndex = 0;
  private recordedSize = 0;
  private options: ResilientRecorderOptions | null = null;
  private stopResolve: ((blob: Blob) => void) | null = null;

  async start(options: ResilientRecorderOptions): Promise<void> {
    if (this.mediaRecorder) throw new Error('Recorder is already active');
    this.options = options;

    await DB.requestPersistentStorage();

    this.sessionId = generateId('session');
    this.sessionName = `webobs-${new Date().toISOString().replace(/[:.]/g, '-')}.${options.mimeType?.includes('mp4') ? 'mp4' : 'webm'}`;
    this.chunks = [];
    this.chunkIndex = 0;
    this.recordedSize = 0;

    let mimeType = options.mimeType;
    if (mimeType && !MediaRecorder.isTypeSupported(mimeType)) mimeType = undefined;
    const finalType = mimeType ?? pickSupportedMimeType();

    const recorderOpts: MediaRecorderOptions = {};
    if (finalType) recorderOpts.mimeType = finalType;
    if (options.videoBitsPerSecond) recorderOpts.videoBitsPerSecond = options.videoBitsPerSecond;
    if (options.audioBitsPerSecond) recorderOpts.audioBitsPerSecond = options.audioBitsPerSecond;

    this.mediaRecorder = new MediaRecorder(options.stream, recorderOpts);

    this.mediaRecorder.addEventListener('dataavailable', this.handleDataAvailable);
    this.mediaRecorder.addEventListener('stop', this.handleStop);
    this.mediaRecorder.addEventListener('error', this.handleError);

    await DB.startSession({
      sessionId: this.sessionId,
      startedAt: Date.now(),
      finished: false,
      name: this.sessionName,
    });

    this.mediaRecorder.start(DEFAULT_TIMESLICE_MS);
  }

  private handleDataAvailable = (event: BlobEvent): void => {
    if (event.data.size === 0) return;
    this.chunks.push(event.data);
    this.recordedSize += event.data.size;
    this.options?.onSizeChange?.(this.recordedSize);

    // Persist chunk to IndexedDB (fire-and-forget; failures shouldn't stop recording)
    void DB.saveChunk(this.sessionId, this.chunkIndex, event.data).catch(() => void 0);
    this.chunkIndex++;
  };

  private handleStop = (): void => {
    const blob = new Blob(this.chunks, { type: this.pickMimeType() });
    this.cleanupRecorder();
    this.options?.onStop?.();
    if (this.stopResolve) {
      this.stopResolve(blob);
      this.stopResolve = null;
    }
  };

  private handleError = (event: Event): void => {
    const err = (event as ErrorEvent).error ?? new Error('MediaRecorder error');
    this.options?.onError?.(err);
  };

  private pickMimeType(): string {
    return this.mediaRecorder?.mimeType ?? 'video/webm';
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /** Stop recording and resolve with the assembled Blob. */
  stop(): Promise<Blob> {
    if (!this.mediaRecorder) return Promise.resolve(new Blob());
    return new Promise<Blob>((resolve) => {
      this.stopResolve = resolve;
      if (this.mediaRecorder!.state === 'inactive') {
        this.stopResolve = null;
        resolve(new Blob(this.chunks, { type: this.pickMimeType() }));
        return;
      }
      try {
        this.mediaRecorder!.stop();
      } catch {
        this.stopResolve = null;
        resolve(new Blob(this.chunks, { type: this.pickMimeType() }));
      }
    });
  }

  /** Abandon the session and delete persisted chunks. */
  async cancel(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.ondataavailable = null;
      try {
        this.mediaRecorder.stop();
      } catch {
        /* no-op */
      }
    }
    await DB.deleteSessionChunks(this.sessionId);
    this.cleanupRecorder();
  }

  private cleanupRecorder(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.removeEventListener('dataavailable', this.handleDataAvailable);
      this.mediaRecorder.removeEventListener('stop', this.handleStop);
      this.mediaRecorder.removeEventListener('error', this.handleError);
    }
    this.mediaRecorder = null;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getSessionName(): string {
    return this.sessionName;
  }

  getState(): RecordingStateLike {
    return this.mediaRecorder?.state ?? 'inactive';
  }

  getSize(): number {
    return this.recordedSize;
  }

  // Static helper to rebuild a finished recording from stored chunks
  static async rebuildFromChunks(sessionId: string): Promise<{ blob: Blob; name: string } | null> {
    const meta = await DB.getSession(sessionId);
    const chunks = await DB.getChunks(sessionId);
    if (chunks.length === 0) return null;
    const blob = new Blob(chunks.map((c) => c.blob), {
      type: chunks[0].blob.type || 'video/webm',
    });
    return { blob, name: meta?.name ?? `recovered-${sessionId}.webm` };
  }

  static deleteStoredSession(sessionId: string): Promise<void> {
    return DB.deleteSessionChunks(sessionId);
  }

  static listIncompleteSessions(): Promise<Array<{ sessionId: string; startedAt: number; name: string; chunkCount: number }>> {
    return DB.listSessions().then((sessions) =>
      sessions
        .filter((s) => !s.finished)
        .map((s) => ({ sessionId: s.sessionId, startedAt: s.startedAt, name: s.name, chunkCount: s.chunkCount }))
    );
  }
}

type RecordingStateLike = 'inactive' | 'recording' | 'paused';