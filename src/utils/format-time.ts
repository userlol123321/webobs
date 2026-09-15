export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(1)} ${units[i]}`;
}

export function formatBitrate(bps: number): string {
  if (bps === 0) return '0 Kbps';
  const kbps = bps / 1000;
  if (kbps < 1000) return `${kbps.toFixed(1)} Kbps`;
  const mbps = kbps / 1000;
  return `${mbps.toFixed(1)} Mbps`;
}

export function formatDb(level: number): string {
  if (level <= 0) return '-∞ dB';
  const db = 20 * Math.log10(level);
  return `${db.toFixed(1)} dB`;
}