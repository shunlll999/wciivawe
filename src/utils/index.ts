// ─── Audio utilities ───────────────────────────────────────────────────────────

/** Format seconds as M:SS */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/** Format bytes as human-readable size */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Format seconds as M:SS, returns '--:--' for missing data */
export function formatDuration(secs: number | null): string {
  if (secs === null || !isFinite(secs)) return '--:--';
  return formatTime(secs);
}

/** Read audio duration from a File via HTMLAudioElement */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const url   = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { resolve(audio.duration); URL.revokeObjectURL(url); };
    audio.onerror = ()         => { resolve(null);            URL.revokeObjectURL(url); };
    audio.src = url;
  });
}

/** Build a downsampled amplitude envelope from an AudioBuffer */
export function buildWaveData(buffer: AudioBuffer, points = 600): Float32Array {
  const ch   = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(ch.length / points));
  const data = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    let max = 0;
    const base = i * step;
    for (let j = 0; j < step; j++) {
      const v = Math.abs(ch[base + j] ?? 0);
      if (v > max) max = v;
    }
    data[i] = max;
  }
  return data;
}

/** Simple energy-peak BPM detector (60-200 BPM range) */
export function detectBPMFromBuffer(buffer: AudioBuffer): number {
  const ch   = buffer.getChannelData(0);
  const sr   = buffer.sampleRate;
  const win  = Math.floor(sr * 0.01);
  const energy: number[] = [];

  for (let i = 0; i + win < ch.length; i += win) {
    let e = 0;
    for (let j = 0; j < win; j++) e += (ch[i + j] ?? 0) ** 2;
    energy.push(e);
  }

  const avg     = energy.reduce((a, b) => a + b, 0) / energy.length;
  let peaks     = 0;
  let lastPeak  = -100;

  for (let i = 1; i < energy.length - 1; i++) {
    const prev = energy[i - 1] ?? 0;
    const cur  = energy[i]     ?? 0;
    const next = energy[i + 1] ?? 0;
    if (cur > avg * 1.5 && cur > prev && cur > next && i - lastPeak > 8) {
      peaks++;
      lastPeak = i;
    }
  }

  let guessed = Math.round(peaks / (buffer.duration / 60));
  if (guessed < 60)  guessed *= 2;
  if (guessed > 200) guessed  = Math.round(guessed / 2);
  return guessed >= 60 && guessed <= 200 ? guessed : 120;
}

// ─── MIDI mapping utilities ───────────────────────────────────────────────────

/** Map MIDI 0-127 to 0..1 volume */
export function midiToVolume(v: number): number {
  return Math.max(0, Math.min(1, v / 127));
}

/** Map MIDI 0-127 to -15..+15 dB EQ (64 = 0 dB) */
export function midiToEq(v: number): number {
  return ((v - 64) / 64) * 15;
}

/** Map MIDI tempo fader value to BPM (±8% of original) */
export function midiToBpm(v: number, originalBpm: number): number {
  const pct = ((v - 64) / 64) * 0.08;
  return Math.round(originalBpm * (1 + pct));
}

/** Map MIDI 0-127 to crossfader 0..1 */
export function midiToCrossfader(v: number): number {
  return v / 127;
}

// ─── General utilities ────────────────────────────────────────────────────────

/** Clamp a number within [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Generate a stable ID for a track */
export function makeTrackId(file: File, index: number): string {
  return `${file.name}-${file.lastModified}-${index}`;
}

/** Check if a file extension is an audio format */
const AUDIO_EXTS = new Set([
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus', 'weba',
]);

export function isAudioFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTS.has(ext);
}

/** Extract file extension (lowercase, no dot) */
export function getFileExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

/** Parse relative path into { folder, name } */
export function parseRelativePath(relativePath: string): {
  folder: string;
  filename: string;
} {
  const parts    = relativePath.split('/');
  const filename = parts[parts.length - 1] ?? relativePath;
  // parts[0] = root folder, parts[1..-2] = sub-folders
  const folder   = parts.length > 2 ? parts.slice(1, -1).join('/') : '';
  return { folder, filename };
}
