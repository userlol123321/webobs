export interface MeterReading {
  level: number;
  db: number;
}

export class AudioMixer {
  readonly ctx: AudioContext;
  private masterGain: GainNode;
  private analyser: AnalyserNode;
  private recDest: MediaStreamAudioDestinationNode;

  private channels = new Map<
    string,
    {
      source: MediaStreamAudioSourceNode;
      gain: GainNode;
      analyser: AnalyserNode;
      stream: MediaStream;
      volume: number;
      muted: boolean;
      meterData: Uint8Array<ArrayBuffer>;
      prevLevel: number;
      prevDb: number;
    }
  >();

  constructor() {
    const Ctor = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;

    // Recording destination: everything connected to masterGain is recorded here
    this.recDest = this.ctx.createMediaStreamDestination();

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.recDest);
    this.masterGain.connect(this.ctx.destination);
    this.analyser.connect(this.ctx.destination);
  }

  get recordingStream(): MediaStream {
    return this.recDest.stream;
  }

  addChannel(id: string, stream: MediaStream, volume = 1, muted = false): void {
    if (this.channels.has(id)) return;

    const source = this.ctx.createMediaStreamSource(stream);
    const gain = this.ctx.createGain();
    gain.gain.value = muted ? 0 : volume;
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;

    source.connect(gain);
    gain.connect(analyser);
    analyser.connect(this.masterGain);

    this.channels.set(id, {
      source,
      gain,
      analyser,
      stream,
      volume,
      muted,
      meterData: new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>,
      prevLevel: 0,
      prevDb: 0,
    });
  }

  removeChannel(id: string): void {
    const ch = this.channels.get(id);
    if (!ch) return;
    try {
      ch.source.disconnect();
      ch.gain.disconnect();
      ch.analyser.disconnect();
    } catch {
      /* no-op */
    }
    ch.stream.getTracks().forEach((t) => t.stop());
    this.channels.delete(id);
  }

  hasChannel(id: string): boolean {
    return this.channels.has(id);
  }

  getChannelCount(): number {
    return this.channels.size;
  }

  setVolume(id: string, volume: number): void {
    const ch = this.channels.get(id);
    if (!ch) return;
    ch.volume = Math.max(0, Math.min(1.5, volume));
    if (!ch.muted) {
      ch.gain.gain.setTargetAtTime(ch.volume, this.ctx.currentTime, 0.02);
    }
  }

  setMuted(id: string, muted: boolean): void {
    const ch = this.channels.get(id);
    if (!ch) return;
    ch.muted = muted;
    ch.gain.gain.setTargetAtTime(muted ? 0 : ch.volume, this.ctx.currentTime, 0.01);
  }

  pollMeter(id: string): MeterReading {
    const ch = this.channels.get(id);
    if (!ch) return { level: 0, db: -Infinity };
    ch.analyser.getByteTimeDomainData(ch.meterData);

    let max: number | null = null;
    const data = ch.meterData;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      const abs = Math.abs(v);
      if (max === null || abs > max) max = abs;
    }
    const level = max ?? 0;
    // Smooth toward previous value for a natural VU feel
    ch.prevLevel = ch.prevLevel * 0.7 + level * 0.3;
    const db = ch.prevLevel < 0.00001 ? -100 : 20 * Math.log10(ch.prevLevel);
    ch.prevDb = db;
    return { level: ch.prevLevel, db };
  }

  get channelsCount(): number {
    return this.channels.size;
  }

  suspend(): void {
    void this.ctx.suspend();
  }

  resume(): Promise<void> {
    return this.ctx.resume();
  }

  get currentTime(): number {
    return this.ctx.currentTime;
  }

  dispose(): void {
    this.channels.forEach((ch) => {
      try {
        ch.source.disconnect();
        ch.gain.disconnect();
        ch.analyser.disconnect();
      } catch {
        /* no-op */
      }
    });
    this.channels.clear();
    void this.ctx.close();
  }
}

let instance: AudioMixer | null = null;

export function getAudioMixer(): AudioMixer {
  if (!instance) {
    instance = new AudioMixer();
  }
  return instance;
}

export function destroyAudioMixer(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}