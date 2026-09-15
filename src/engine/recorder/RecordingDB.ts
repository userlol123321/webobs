/**
 * IndexedDB persistence for recording chunks.
 * Database: webobs-recordings
 * Stores:
 *  - sessions: { sessionId, startedAt, finished, name, chunkCount }
 *  - chunks:   { id, sessionId, index, blob, time }
 */

const DB_NAME = 'webobs-recordings';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const CHUNKS_STORE = 'chunks';

export interface RecordingSessionMeta {
  sessionId: string;
  startedAt: number;
  finished: boolean;
  name: string;
  chunkCount: number;
}

export interface RecordingChunk {
  id: string;
  sessionId: string;
  index: number;
  blob: Blob;
  time: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not supported'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const store = db.createObjectStore(SESSIONS_STORE, { keyPath: 'sessionId' });
        store.createIndex('finished', 'finished', { unique: false });
      }
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const store = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('sessionIndex', ['sessionId', 'index'], { unique: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function transaction<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function startSession(meta: Omit<RecordingSessionMeta, 'chunkCount'>): Promise<void> {
  const record: RecordingSessionMeta = { ...meta, chunkCount: 0 };
  return transaction(SESSIONS_STORE, 'readwrite', (store) => store.put(record)).then(() => void 0);
}

export function saveChunk(
  sessionId: string,
  index: number,
  blob: Blob
): Promise<void> {
  const chunk: RecordingChunk = {
    id: `${sessionId}_${index}`,
    sessionId,
    index,
    blob,
    time: Date.now(),
  };
  return Promise.all([
    transaction(CHUNKS_STORE, 'readwrite', (store) => store.put(chunk)),
    transaction(SESSIONS_STORE, 'readwrite', (store) => {
      return store.get(sessionId) as IDBRequest<RecordingSessionMeta | undefined>;
    }).then((meta) => {
      if (meta) {
        const updated = { ...meta, finished: meta.finished, chunkCount: meta.chunkCount + 1 };
        return transaction(SESSIONS_STORE, 'readwrite', (store) => store.put(updated)) as Promise<unknown>;
      }
      return undefined;
    }),
  ]).then(() => void 0);
}

export function markSessionFinished(sessionId: string): Promise<void> {
  return transaction(SESSIONS_STORE, 'readwrite', (store) => {
    const req = store.get(sessionId) as IDBRequest<RecordingSessionMeta | undefined>;
    return req;
  }).then((meta) => {
    if (!meta) return undefined;
    return transaction(SESSIONS_STORE, 'readwrite', (store) =>
      store.put({ ...meta, finished: true })
    ) as Promise<unknown>;
  }).then(() => void 0);
}

export function getSession(sessionId: string): Promise<RecordingSessionMeta | undefined> {
  return transaction(SESSIONS_STORE, 'readonly', (store) =>
    store.get(sessionId) as IDBRequest<RecordingSessionMeta | undefined>
  );
}

export function listSessions(): Promise<RecordingSessionMeta[]> {
  return openDB().then(
    (db) =>
      new Promise<RecordingSessionMeta[]>((resolve, reject) => {
        const tx = db.transaction(SESSIONS_STORE, 'readonly');
        const req = tx.objectStore(SESSIONS_STORE).getAll() as IDBRequest<RecordingSessionMeta[]>;
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export function getChunks(sessionId: string): Promise<RecordingChunk[]> {
  return openDB().then(
    (db) =>
      new Promise<RecordingChunk[]>((resolve, reject) => {
        const tx = db.transaction(CHUNKS_STORE, 'readonly');
        const idx = tx.objectStore(CHUNKS_STORE).index('sessionId');
        const req = idx.getAll(sessionId) as IDBRequest<RecordingChunk[]>;
        req.onsuccess = () => {
          const chunks = req.result;
          chunks.sort((a, b) => a.index - b.index);
          resolve(chunks);
        };
        req.onerror = () => reject(req.error);
      })
  );
}

export function deleteSessionChunks(sessionId: string): Promise<void> {
  return getChunks(sessionId).then((chunks) => {
    if (chunks.length === 0) return undefined;
    return openDB().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(CHUNKS_STORE, 'readwrite');
          let pending = chunks.length;
          let failed: DOMException | null = null;
          chunks.forEach((c) => {
            const req = tx.objectStore(CHUNKS_STORE).delete(c.id);
            req.onerror = () => {
              failed = failed ?? req.error;
              pending--;
              if (pending === 0) {
                if (failed) reject(failed);
                else resolve();
              }
            };
            req.onsuccess = () => {
              pending--;
              if (pending === 0) {
                if (failed) reject(failed);
                else resolve();
              }
            };
          });
        })
    );
  }).then(() => transaction(SESSIONS_STORE, 'readwrite', (store) => store.delete(sessionId)).then(() => void 0));
}

export function clearAllRecordings(): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction([SESSIONS_STORE, CHUNKS_STORE], 'readwrite');
        const s1 = tx.objectStore(SESSIONS_STORE).clear();
        const c1 = tx.objectStore(CHUNKS_STORE).clear();
        let done = 0;
        const onDone = (err: unknown) => {
          done++;
          if (err) { reject(err); return; }
          if (done === 2) resolve();
        };
        s1.onsuccess = () => onDone(null);
        s1.onerror = () => onDone(s1.error);
        c1.onsuccess = () => onDone(null);
        c1.onerror = () => onDone(c1.error);
      })
  );
}

export function estimateStoredSize(sessionId: string): Promise<number> {
  return getChunks(sessionId).then((chunks) =>
    chunks.reduce((acc, c) => acc + c.blob.size, 0)
  );
}