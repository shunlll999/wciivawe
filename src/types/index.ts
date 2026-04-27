// ─── Deck ─────────────────────────────────────────────────────────────────────

/** Which physical deck slot */
export type DeckId = 'A' | 'B';

/** 3-band EQ values in dB */
export interface EqState {
  low: number;   // -15 .. +15 dB
  mid: number;
  high: number;
}

/** A single hot-cue marker (logical time in seconds, or null = unset) */
export type HotCuePoint = number | null;

/** Complete state snapshot for one deck */
export interface DeckState {
  isPlaying: boolean;
  /** Logical duration at current playbackRate (seconds) */
  duration: number;
  /** Original buffer duration before tempo stretch (seconds) */
  rawDuration: number;
  /** 0..1 */
  progress: number;
  /** Current logical playhead position (seconds) */
  currentTime: number;
  /** Static amplitude envelope for waveform display */
  waveData: Float32Array | null;
  /** Live time-domain samples for oscilloscope overlay */
  liveData: Uint8Array | null;
  /** Display name (filename without extension) */
  fileName: string;
  /** Target BPM (may differ from originalBpm when stretched) */
  bpm: number;
  /** BPM detected from the audio file */
  originalBpm: number;
  /** Fader volume 0..1 */
  volume: number;
  loopOn: boolean;
  hotCues: readonly HotCuePoint[];
  eq: EqState;
  isLoaded: boolean;
  isDragOver: boolean;
}

/** Public action API returned by useDeck */
export interface DeckActions {
  loadFile(file: File, autoPlay?: boolean): void;
  togglePlay(): void;
  seek(ratio: number): void;
  cue(): void;
  toggleLoop(): void;
  setHotCue(idx: number, clear?: boolean): void;
  jumpHotCue(idx: number): void;
  setVolume(v: number): void;
  setEqBand(band: keyof EqState, db: number): void;
  setBpm(bpm: number): void;
  setIsDragOver(v: boolean): void;
  /** Internal — called by crossfader logic */
  _setCrossfaderGain(v: number): void;
}

export type DeckHandle = DeckState & DeckActions;

// ─── Music Theory ──────────────────────────────────────────────────────────────

export type NoteName =
  | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F'
  | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

/** 0 = C, 1 = C#, … 11 = B */
export type RootKeyIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ScaleName = 'major' | 'minor' | 'dorian' | 'pentatonic' | 'blues';

export interface TimeSig {
  beats: number;
  division: number;
  name: string;
}

export interface DiatonicChord {
  root: NoteName;
  numeral: string;
  quality: string;
}

export interface BarInfo {
  currentBar: number;
  totalBars: number;
  currentBeat: number;
}

// ─── MIDI ──────────────────────────────────────────────────────────────────────

export type MidiStatus =
  | 'idle'
  | 'requesting'
  | 'connected'
  | 'no-device'
  | 'unsupported'
  | 'denied';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export interface MidiSignal {
  channel: number;
  msgType: number;
  byte1: number;
  byte2: number;
  ts: number;
}

/** A single MIDI binding (note or CC on a specific channel) */
export type MidiBindingType = 'note' | 'cc';

export interface MidiNoteBinding {
  type: 'note';
  note: number;
}

export interface MidiCCBinding {
  type: 'cc';
  cc: number;
}

export type MidiBinding = MidiNoteBinding | MidiCCBinding;

export interface MidiDeckMap {
  channel: number;
  play: MidiNoteBinding;
  cue: MidiNoteBinding;
  sync?: MidiNoteBinding;
  loopIn?: MidiNoteBinding;
  loopOut?: MidiNoteBinding;
  tempo: MidiCCBinding;
  volume: MidiCCBinding;
  eqHigh: MidiCCBinding;
  eqMid: MidiCCBinding;
  eqLow: MidiCCBinding;
  /** Note numbers for pads 0-7 */
  hotCue: readonly number[];
}

export interface MidiGlobalBinding {
  channel: number;
  type: MidiBindingType;
  cc: number;
}

export interface ControllerPreset {
  name: string;
  decks: readonly [MidiDeckMap, MidiDeckMap, ...MidiDeckMap[]];
  crossfader: MidiGlobalBinding;
}

export type PresetKey = string;

/** Per-deck MIDI callbacks */
export interface MidiDeckCallbacks {
  onDeckPlay?: (deckIdx: number) => void;
  onDeckCue?: (deckIdx: number) => void;
  onDeckBpm?: (deckIdx: number, bpm: number) => void;
  onDeckVolume?: (deckIdx: number, volume: number) => void;
  onDeckEqHigh?: (deckIdx: number, db: number) => void;
  onDeckEqMid?: (deckIdx: number, db: number) => void;
  onDeckEqLow?: (deckIdx: number, db: number) => void;
  onDeckHotCue?: (deckIdx: number, padIdx: number) => void;
  onCrossfader?: (value: number) => void;
  /** Original BPMs per deck for tempo calc */
  deckOrigBpms?: readonly [number, number];
  // Legacy single-deck fallbacks
  onPlay?: () => void;
  onCue?: () => void;
  onBpm?: (bpm: number) => void;
  onFilterLow?: (v: number) => void;
  onFilterMid?: (v: number) => void;
  onFilterHigh?: (v: number) => void;
  onHotCue?: (idx: number) => void;
}

export interface MidiHandle {
  status: MidiStatus;
  devices: MidiDevice[];
  preset: PresetKey;
  learnTarget: string | null;
  lastSignal: MidiSignal | null;
  filters: { low: number; mid: number; high: number };
  requestMIDI(): Promise<void>;
  applyPreset(key: PresetKey): void;
  startLearn(target: string | null): void;
  cancelLearn(): void;
  /** Unused in new arch but kept for legacy MIDIPanel compat */
  mapping: null;
  resetMapping(): void;
  clearBinding(): void;
  hotCuePoints: HotCuePoint[];
}

// ─── Playlist ──────────────────────────────────────────────────────────────────

export type SortKey = 'name' | 'folder' | 'duration' | 'size';

export interface TrackItem {
  id: string;
  file: File;
  name: string;
  ext: string;
  folder: string;
  duration: number | null;
  size: number;
  path: string;
}

// ─── Utility helpers ───────────────────────────────────────────────────────────

/** Exhaustive check — call in default branch of switch */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}

/** Clamp a number within [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Type-safe Object.entries */
export function typedEntries<K extends string, V>(
  obj: Record<K, V>,
): Array<[K, V]> {
  return Object.entries(obj) as Array<[K, V]>;
}

/** Type-safe Object.keys */
export function typedKeys<K extends string>(obj: Record<K, unknown>): K[] {
  return Object.keys(obj) as K[];
}

/** Guard: is the value non-null and non-undefined */
export function isDefined<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}
