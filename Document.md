# 🎛 WCIIVAWE Visualizer

> Dual-deck DJ audio player พร้อม waveform visualizer, bar/beat grid ตามทฤษฎีดนตรี,
> BPM tempo stretch, keyboard navigation และ Web MIDI API สำหรับ **Pioneer DDJ-GRV6**
>
> สร้างด้วย **React 18 + TypeScript 5** (strict mode)

---

## สารบัญ

- [ความต้องการของระบบ](#ความต้องการของระบบ)
- [การติดตั้ง](#การติดตั้ง)
- [วิธีใช้งาน](#วิธีใช้งาน)
  - [Playlist และการ Import](#playlist-และการ-import)
  - [การโหลดเพลงเข้า Deck](#การโหลดเพลงเข้า-deck)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [BPM Tempo Stretch](#bpm-tempo-stretch)
  - [Crossfader](#crossfader)
  - [Hot Cues](#hot-cues)
  - [DJ Controller (MIDI)](#dj-controller-midi)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [Architecture](#architecture)
  - [Audio Graph](#audio-graph)
  - [State Management](#state-management)
  - [Data Flow](#data-flow)
- [Type Reference](#type-reference)
  - [Domain Types](#domain-types)
  - [Utility Types](#utility-types)
- [Hook Reference](#hook-reference)
  - [useDeck](#usedeck)
  - [useMIDI](#usemidi)
- [Utility Functions](#utility-functions)
- [Music Theory Module](#music-theory-module)
- [Component Reference](#component-reference)
- [DDJ-GRV6 MIDI Mapping](#ddj-grv6-midi-mapping)
- [การเพิ่ม Controller ใหม่](#การเพิ่ม-controller-ใหม่)
- [CSS Custom Properties](#css-custom-properties)

---
Screen Short

<img width="729" height="888" alt="screen" src="https://github.com/user-attachments/assets/d9495480-c7f4-4dc2-b62e-3d1a7c0a6aa0" />


## ความต้องการของระบบ

| รายการ | เวอร์ชัน |
|--------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Browser | Chrome 89+ หรือ Edge 89+ |

> **หมายเหตุ:** Web MIDI API ต้องใช้ **Chrome หรือ Edge เท่านั้น**
> Firefox ต้องติดตั้ง extension เพิ่ม / Safari ไม่รองรับ
> ฟีเจอร์เล่นเพลงและ visualizer ทำงานได้ทุก browser

---

## การติดตั้ง

```bash
# 1. แตกไฟล์และเข้า directory
unzip wciivawe-master.zip
cd music-visualizer

# 2. ติดตั้ง dependencies
npm install

# 3. รันในโหมด development
npm start
# เปิด http://localhost:3000

# 4. Build สำหรับ production
npm run build

# 5. ตรวจสอบ TypeScript (optional)
npm run typecheck
```

---

## วิธีใช้งาน

### Playlist และการ Import

1. คลิก **📂 Import Folder** ที่ส่วน Playlist ด้านล่าง
2. เลือก folder เพลงจากเครื่อง — รองรับ sub-folder อัตโนมัติ
3. แอปจะอ่าน duration ของทุกไฟล์และแสดงรายการ

**รูปแบบไฟล์ที่รองรับ:** MP3 · WAV · FLAC · OGG · AAC · M4A · Opus · WebA

**การเรียงลำดับ:** คลิก Name / Folder / Duration / Size — คลิกซ้ำเพื่อสลับทิศ ↑↓

**การค้นหา:** พิมพ์ในช่อง Search เพื่อกรองแบบ real-time

---

### การโหลดเพลงเข้า Deck

มี 4 วิธี:

| วิธี | ผล |
|------|----|
| **คลิก** track ใน Playlist | โหลดเข้า Deck A, highlight track |
| **Hover** แล้วกดปุ่ม **A** หรือ **B** | โหลดเข้า Deck ที่ต้องการโดยตรง |
| **Drag** track ไปวางบน Deck | โหลดเข้า Deck ที่วาง |
| **SHIFT + ←/→** | โหลด track ที่ highlight ปัจจุบันเข้า Deck A หรือ B |

> หลังโหลดแล้วต้องกด **Play** เพื่อเริ่มเล่น — ไม่มี autoplay

---

### Keyboard Shortcuts

#### Playlist Navigation

| Key | การทำงาน |
|-----|----------|
| `↑` | เลื่อน highlight ขึ้น 1 track |
| `↓` | เลื่อน highlight ลง 1 track |
| `Home` | ไปที่ track แรก |
| `End` | ไปที่ track สุดท้าย |
| `Enter` | เลือก track ที่ highlight อยู่ (โหลดเข้า Deck A) |
| `Escape` (ในช่อง Search) | ออกจาก Search กลับไปที่ list |

> Track ที่ keyboard focus จะมี **เส้นซ้ายสี** และ **ชื่อ bold**

#### Global Shortcuts

| Key | การทำงาน |
|-----|----------|
| `SHIFT + ←` | โหลด track ที่ highlight เข้า **Deck A** |
| `SHIFT + →` | โหลด track ที่ highlight เข้า **Deck B** |
| `SHIFT + Space` | Play / Pause Active Deck |
| `SHIFT + A` | Switch focus เป็น Deck A |
| `SHIFT + B` | Switch focus เป็น Deck B |

**Workflow แนะนำ:**

```
1. ↑↓         เลื่อนหา track ที่ต้องการ
2. SHIFT+←    โหลดเข้า Deck A  (หรือ SHIFT+→ สำหรับ Deck B)
3. Play       กดที่ Deck เพื่อเริ่มเล่น
```

---

### BPM Tempo Stretch

แต่ละ deck สามารถปรับความเร็วได้โดยไม่เปลี่ยน pitch:

- **Slider TEMPO** ใต้ waveform — ปรับ ±15% จาก original BPM
- **คลิกตัวเลข BPM** — พิมพ์ค่าโดยตรง (40–250)
- **Double-click slider** หรือ **กดปุ่ม RST** — reset กลับ original BPM
- **Tempo Fader บน DDJ-GRV6** (CC 0) — center 64 = original BPM, ±8%

เมื่อ tempo ถูก stretch จะแสดง `orig 128` และ `+5.0%` ใต้ตัวเลข BPM

> **หลักการ:** ใช้ `AudioBufferSourceNode.playbackRate = targetBpm / originalBpm`
> Hot Cue, seek, progress คำนวณทั้งหมดใน *logical time* ที่ปรับ rate แล้ว

---

### Crossfader

Slider ใหญ่ระหว่าง Deck A และ B ที่ด้านล่าง:

- ชิดซ้าย → เสียงออก Deck A อย่างเดียว
- กลาง → เสียงเท่ากัน
- ชิดขวา → เสียงออก Deck B อย่างเดียว
- **Double-click** หรือ **กด CENTER** → reset กลาง
- **DDJ-GRV6 Crossfader** (CC 31, CH 7) → ควบคุมโดยตรง

Volume fader ของแต่ละ deck เป็นอิสระจาก crossfader

---

### Hot Cues

แต่ละ deck มี 8 Hot Cue point (A–H):

| การกระทำ | ผล |
|----------|-----|
| กดปุ่ม pad ที่ **ว่าง** | Set hot cue ณ ตำแหน่ง playhead ปัจจุบัน |
| กดปุ่ม pad ที่ **มีค่า** | Jump ไปที่ position นั้น |
| กด **✕** ใต้ pad | ลบ hot cue |
| DDJ-GRV6 Pad 1–8 | Set หรือ Jump ตาม mode ปัจจุบัน |

Hot cue markers แสดงเป็นเส้นสีบน progress bar

---

### DJ Controller (MIDI)

1. เสียบ controller ผ่าน USB
2. เปิดแอปใน **Chrome** หรือ **Edge**
3. คลิกแถบ **MIDI** ด้านล่าง → **Connect MIDI**
4. หาก detect ชื่อ DDJ-GRV6 จะ load preset อัตโนมัติ

**Active Deck:** กดปุ่ม **A** หรือ **B** ใน header เพื่อเลือก deck ที่ MIDI ควบคุม

- Deck 1 ของ DDJ-GRV6 (MIDI CH 1) → ควบคุม **Deck A** เสมอ
- Deck 2 ของ DDJ-GRV6 (MIDI CH 2) → ควบคุม **Deck B** เสมอ

---

## โครงสร้างโปรเจกต์

```
wciivawe-master/
├── public/
│   └── index.html
├── src/
│   ├── index.tsx              # Entry point
│   ├── App.tsx                # Root component — orchestrates all state
│   ├── index.css              # CSS custom properties + global styles
│   │
│   ├── types/
│   │   └── index.ts           # Domain types ทั้งหมด + utility type helpers
│   │
│   ├── utils/
│   │   └── index.ts           # Pure functions (audio, MIDI mapping, file, format)
│   │
│   ├── musicTheory.ts         # Constants + helpers (scales, chords, tempo, time sig)
│   │
│   ├── hooks/
│   │   ├── useDeck.ts         # Web Audio engine สำหรับ 1 deck
│   │   └── useMIDI.ts         # Web MIDI API + per-deck routing
│   │
│   └── components/
│       ├── Deck.tsx            # UI ของ 1 deck (waveform, transport, EQ, hot cues)
│       ├── Playlist.tsx        # Track list + keyboard navigation
│       ├── WaveformCanvas.tsx  # Canvas — static envelope + live oscilloscope
│       ├── BarGrid.tsx         # Canvas — bar/beat grid
│       ├── TheoryPanel.tsx     # Key, Scale, BPM, Time Sig display
│       ├── ChordRow.tsx        # Diatonic chord pills
│       ├── PianoRoll.tsx       # Piano keyboard แสดง scale notes
│       └── MIDIStatusBar.tsx   # MIDI connection + mapping reference
│
├── tsconfig.json
└── package.json
```

---

## Architecture

### Audio Graph

แต่ละ deck สร้าง Web Audio node chain แยกกัน แชร์ `AudioContext` เดียวกัน:

```
AudioBufferSourceNode  ← playbackRate = targetBpm / originalBpm
         │
         ▼
   AnalyserNode        → liveData (Uint8Array 1024 points สำหรับ oscilloscope)
         │
         ▼
BiquadFilter LOW       ← lowshelf  250 Hz   gain: -15..+15 dB
         │
         ▼
BiquadFilter MID       ← peaking  1000 Hz  Q=0.7  gain: -15..+15 dB
         │
         ▼
BiquadFilter HIGH      ← highshelf 4000 Hz  gain: -15..+15 dB
         │
         ▼
    GainNode           ← volume fader (0..1)
         │
         ▼
    GainNode           ← crossfader gain (0..1) ควบคุมจาก App
         │
         ▼
AudioContext.destination
```

### State Management

ใช้ React hooks ล้วน ไม่มี external state library:

```
App.tsx
├── useSharedAudio()       → AudioContext (lazy init เมื่อ user interact ครั้งแรก)
├── useDeck(ctx, 'A')      → DeckHandle  (state + actions ของ Deck A)
├── useDeck(ctx, 'B')      → DeckHandle  (state + actions ของ Deck B)
├── useMIDI(callbacks)     → MidiHandle  (MIDI device + per-deck routing)
├── activeDeck             → 'A' | 'B'  (MIDI/keyboard focus)
├── crossfader             → 0..1
├── rootKey                → RootKeyIndex (0..11)
├── scaleName              → ScaleName
└── selectedTrackRef       → File | null  (track ที่ highlight ใน playlist)
```

`useDeck` ใช้ `useRef` สำหรับค่าที่ต้องอ่านใน `requestAnimationFrame` closure เพื่อป้องกัน stale closure:

```ts
// refs — อ่านค่าล่าสุดจาก rAF ได้ทันทีโดยไม่ trigger re-render
isPlayingRef     pauseOffsetRef    startTimeRef
playbackRateRef  loopOnRef         originalBpmRef
```

### Data Flow

```
User Interaction
      │
      ├─ Keyboard ──────────────────────────────► App.tsx (keydown handler)
      │                                                │
      ├─ MIDI Controller ──► useMIDI.ts               │
      │   (onmidimessage)        │                     │
      │                     callbacks ────────────────┘
      │                                                │
      └─ UI Click / Drag ─────────────────────────────┘
                                                       │
                       ┌───────────────────────────────┘
                       │
                       ▼
                useDeck.ts (Audio Engine)
                       │
         ┌─────────────┼──────────────────────┐
         │             │                      │
    loadFile()    togglePlay()           setBpm()
         │             │                      │
   FileReader    seekAndPlayInternal()   source.playbackRate
   decodeAudio   rAF animate()           setDuration()
   buildWaveData setProgress/LiveData
   detectBPM
```

---

## Type Reference

### Domain Types

`src/types/index.ts`

#### Deck Types

```typescript
type DeckId = 'A' | 'B'

interface EqState {
  low:  number  // -15..+15 dB  (lowshelf 250 Hz)
  mid:  number  // -15..+15 dB  (peaking 1000 Hz)
  high: number  // -15..+15 dB  (highshelf 4000 Hz)
}

type HotCuePoint = number | null  // logical seconds หรือ null = ยังไม่ set

interface DeckState {
  isPlaying:   boolean
  duration:    number        // ความยาวหลัง tempo stretch (วินาที)
  rawDuration: number        // ความยาวจริงของ buffer ก่อน stretch
  progress:    number        // 0..1
  currentTime: number        // logical seconds (ปรับ rate แล้ว)
  waveData:    Float32Array | null  // 600 points amplitude envelope
  liveData:    Uint8Array | null    // 1024 points time-domain (oscilloscope)
  fileName:    string        // ชื่อไฟล์ไม่รวม extension
  bpm:         number        // target BPM (อาจต่างจาก originalBpm เมื่อ stretch)
  originalBpm: number        // BPM ที่ detect จากไฟล์
  volume:      number        // 0..1
  loopOn:      boolean
  hotCues:     readonly HotCuePoint[]  // 8 จุด index 0–7
  eq:          EqState
  isLoaded:    boolean
  isDragOver:  boolean
}

interface DeckActions {
  loadFile(file: File, autoPlay?: boolean): void
  togglePlay(): void
  seek(ratio: number): void           // ratio 0..1
  cue(): void                         // DJ CUE — set เมื่อเล่น / jump เมื่อหยุด
  toggleLoop(): void
  setHotCue(idx: number, clear?: boolean): void
  jumpHotCue(idx: number): void
  setVolume(v: number): void          // 0..1
  setEqBand(band: keyof EqState, db: number): void
  setBpm(bpm: number): void           // 40..250
  setIsDragOver(v: boolean): void
  _setCrossfaderGain(v: number): void // internal, เรียกจาก App
}

type DeckHandle = DeckState & DeckActions
```

#### Music Theory Types

```typescript
type NoteName =
  | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F'
  | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

type RootKeyIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
//                  C   C#  D   D#  E   F   F#  G   G#  A   A#   B

type ScaleName = 'major' | 'minor' | 'dorian' | 'pentatonic' | 'blues'

interface TimeSig     { beats: number; division: number; name: string }
interface DiatonicChord { root: NoteName; numeral: string; quality: string }
interface BarInfo     { currentBar: number; totalBars: number; currentBeat: number }
```

#### MIDI Types

```typescript
type MidiStatus =
  | 'idle' | 'requesting' | 'connected'
  | 'no-device' | 'unsupported' | 'denied'

interface MidiDevice  { id: string; name: string; manufacturer: string }
interface MidiSignal  {
  channel: number; msgType: number
  byte1: number; byte2: number; ts: number
}

interface MidiNoteBinding { type: 'note'; note: number }
interface MidiCCBinding   { type: 'cc';   cc: number   }
type MidiBinding = MidiNoteBinding | MidiCCBinding

interface MidiDeckMap {
  channel:  number
  play:     MidiNoteBinding
  cue:      MidiNoteBinding
  sync?:    MidiNoteBinding
  loopIn?:  MidiNoteBinding
  loopOut?: MidiNoteBinding
  tempo:    MidiCCBinding     // 14-bit MSB
  volume:   MidiCCBinding     // 14-bit MSB
  eqHigh:   MidiCCBinding
  eqMid:    MidiCCBinding
  eqLow:    MidiCCBinding
  hotCue:   readonly number[] // Note numbers สำหรับ pad 0–7
}

interface ControllerPreset {
  name:       string
  decks:      readonly [MidiDeckMap, MidiDeckMap, ...MidiDeckMap[]]
  crossfader: MidiGlobalBinding
}

interface MidiDeckCallbacks {
  onDeckPlay?:   (deckIdx: number) => void
  onDeckCue?:    (deckIdx: number) => void
  onDeckBpm?:    (deckIdx: number, bpm: number) => void
  onDeckVolume?: (deckIdx: number, volume: number) => void  // 0..1
  onDeckEqHigh?: (deckIdx: number, db: number) => void
  onDeckEqMid?:  (deckIdx: number, db: number) => void
  onDeckEqLow?:  (deckIdx: number, db: number) => void
  onDeckHotCue?: (deckIdx: number, padIdx: number) => void
  onCrossfader?: (value: number) => void                   // 0..1
  deckOrigBpms?: readonly [number, number]
}
```

#### Playlist Types

```typescript
type SortKey = 'name' | 'folder' | 'duration' | 'size'

interface TrackItem {
  id:       string        // stable ID: `${name}-${lastModified}-${index}`
  file:     File
  name:     string        // ชื่อไม่รวม extension
  ext:      string        // lowercase extension ไม่มี dot
  folder:   string        // relative sub-folder path
  duration: number | null
  size:     number        // bytes
  path:     string        // webkitRelativePath
}
```

### Utility Types

`src/types/index.ts` — export ให้ใช้งานทั่วโปรเจกต์

```typescript
// Exhaustive check — ใส่ใน default branch ของ switch เพื่อ type safety
function assertNever(x: never): never

// Clamp number ภายใน range [min, max]
function clamp(value: number, min: number, max: number): number

// Type-safe Object.entries — preserve key literal type
function typedEntries<K extends string, V>(obj: Record<K, V>): Array<[K, V]>

// Type-safe Object.keys — preserve key literal type
function typedKeys<K extends string>(obj: Record<K, unknown>): K[]

// Non-null/undefined guard ใช้กับ Array.filter
function isDefined<T>(v: T | null | undefined): v is T
```

---

## Hook Reference

### useDeck

`src/hooks/useDeck.ts`

สร้าง Web Audio node chain และจัดการ playback ของ 1 deck

```typescript
function useDeck(
  audioCtx: AudioContext | null,
  deckId: 'A' | 'B',
): DeckHandle
```

**พฤติกรรมสำคัญ:**

| เรียก | ผล |
|-------|----|
| `loadFile(file)` | stop + reset hot cues + detect BPM ใหม่ |
| `seek(ratio)` | ถ้าเล่นอยู่: re-start จากตำแหน่งใหม่ทันที |
| `cue()` | เล่นอยู่ → หยุด + บันทึก cue point / หยุดอยู่ → เล่นจาก cue point |
| `setBpm(n)` | clamp 40–250, apply `playbackRate` ทันที, อัปเดต logical duration |
| `setHotCue(idx)` | บันทึก logical time ณ ตำแหน่งปัจจุบัน |
| `jumpHotCue(idx)` | seek ไปที่ hot cue position |

> Hot cue timestamps เก็บและคำนวณใน **logical time** หลัง rate adjustment

### useMIDI

`src/hooks/useMIDI.ts`

จัดการ Web MIDI API และ route message ไปยัง callback ต่าง ๆ

```typescript
function useMIDI(callbacks: MidiDeckCallbacks): MidiHandle
```

**การ route message (ต่อ incoming MIDI message):**

1. อ่าน `status byte` → แยก channel และ message type (Note On / CC)
2. วน `preset.decks` หา deck index จาก `deck.channel`
3. จับคู่ `byte1` กับ binding (`play.note`, `tempo.cc`, ฯลฯ)
4. แปลงค่า `byte2` (0–127) ด้วย utility function
5. เรียก `onDeckXxx(deckIdx, value)`

---

## Utility Functions

`src/utils/index.ts`

### Audio

| Function | Signature | ผล |
|----------|-----------|-----|
| `formatTime` | `(seconds: number) → string` | วินาที → `"M:SS"` |
| `formatDuration` | `(secs: number \| null) → string` | เหมือน formatTime แต่รับ null → `"--:--"` |
| `formatSize` | `(bytes: number) → string` | bytes → `"X KB"` หรือ `"X.X MB"` |
| `readAudioDuration` | `(file: File) → Promise<number \| null>` | อ่าน duration จากไฟล์ผ่าน HTMLAudioElement |
| `buildWaveData` | `(buffer: AudioBuffer, points?: number) → Float32Array` | สร้าง amplitude envelope (default 600 points) |
| `detectBPMFromBuffer` | `(buffer: AudioBuffer) → number` | Energy-peak BPM detection (range 60–200) |

### MIDI Mapping

| Function | Signature | สูตร |
|----------|-----------|------|
| `midiToVolume` | `(v: number) → number` | `v / 127` → 0..1 |
| `midiToEq` | `(v: number) → number` | `((v-64)/64) × 15` → -15..+15 dB |
| `midiToBpm` | `(v: number, origBpm: number) → number` | `origBpm × (1 + ((v-64)/64 × 0.08))` ±8% |
| `midiToCrossfader` | `(v: number) → number` | `v / 127` → 0..1 |

### File / General

| Function | ผล |
|----------|----|
| `isAudioFile(file)` | ตรวจสอบว่าเป็น audio format ที่รองรับ |
| `getFileExt(filename)` | extension lowercase ไม่มี dot เช่น `"mp3"` |
| `parseRelativePath(path)` | แยก `webkitRelativePath` → `{ folder, filename }` |
| `makeTrackId(file, index)` | stable ID: `"name-lastModified-index"` |
| `clamp(value, min, max)` | Clamp number ภายใน range |

---

## Music Theory Module

`src/musicTheory.ts`

### Constants

```typescript
NOTE_NAMES: readonly NoteName[]
// ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

SCALES: Record<ScaleName, readonly number[]>
// major:      [0, 2, 4, 5, 7, 9, 11]   Ionian
// minor:      [0, 2, 3, 5, 7, 8, 10]   Aeolian
// dorian:     [0, 2, 3, 5, 7, 9, 10]   Dorian
// pentatonic: [0, 2, 4, 7, 9]
// blues:      [0, 3, 5, 6, 7, 10]

TIME_SIGNATURES: readonly TimeSig[]
// 4/4 Common time | 3/4 Waltz | 6/8 Compound duple
// 5/4 Quintuple   | 7/8 Septuple | 2/4 Cut time
```

### Functions

```typescript
getTempoName(120)
// → "Allegro"

getScaleNotes(0, 'major')
// → ['C', 'D', 'E', 'F', 'G', 'A', 'B']

getDiatonicChords(0, 'major')
// → [
//   { root: 'C', numeral: 'I',   quality: 'maj' },
//   { root: 'D', numeral: 'II',  quality: 'min' },
//   { root: 'E', numeral: 'III', quality: 'min' },
//   ...
// ]
```

**Tempo Marks:**

| BPM | Marking | | BPM | Marking |
|-----|---------|--|-----|---------|
| < 40 | Grave | | 108–119 | Moderato |
| 40–59 | Largo | | 120–155 | **Allegro** |
| 60–65 | Larghetto | | 156–175 | Vivace |
| 66–75 | Adagio | | 176–199 | Presto |
| 76–107 | Andante | | ≥ 200 | Prestissimo |

---

## Component Reference

### `<Deck>`

```typescript
interface DeckProps {
  deckId:     'A' | 'B'
  deck:       DeckHandle         // จาก useDeck()
  timeSig:    TimeSig
  onBarInfo:  (info: BarInfo) => void
  isActive:   boolean            // border highlight + MIDI focus indicator
  onActivate: () => void
}
```

แสดง: track name + time, waveform, tempo slider (±15%), progress bar + hot cue markers,
bar/beat grid, transport buttons (CUE / Play / Loop), volume fader,
3-band EQ vertical sliders (double-click = reset 0 dB), 8 hot cue pads, + FILE button

รองรับ drag-and-drop จาก Playlist และจาก OS

### `<Playlist>`

```typescript
interface PlaylistProps {
  currentFileNameA:  string
  currentFileNameB:  string
  onSelect:          (file: File, preferDeck: DeckId) => void
  onLoadToDeck:      (deckId: DeckId, file: File) => void
  onTrackHighlight?: (file: File) => void
}
```

ฟีเจอร์: keyboard navigation (↑↓ Enter Home End Escape),
drag-to-deck, sort by 4 fields, real-time search, folder grouping,
แสดง selected track ใน header

### `<WaveformCanvas>`

```typescript
interface WaveformCanvasProps {
  waveData:     Float32Array | null  // static envelope (600 points)
  liveData:     Uint8Array | null    // live oscilloscope (1024 points)
  progress:     number               // 0..1
  accentColor?: string
}
```

ส่วนที่เล่นผ่านแล้วจะสว่างกว่า, overlay live waveform ระหว่างเล่น,
playhead เป็นเส้นสีชมพู

### `<BarGrid>`

```typescript
interface BarGridProps {
  duration:     number
  bpm:          number
  timeSig:      TimeSig
  progress:     number
  onBarInfo?:   (info: BarInfo) => void
  accentColor?: string
}
```

แสดง bar/measure แบ่งตาม BPM + time signature,
beat subdivisions เป็นเส้นประ, beat indicator block สีชมพู,
ตัวเลข bar number ถ้า zoom พอ

### `<TheoryPanel>`

แสดง: Key (คลิกเพื่อ cycle ทุก 12 keys), Scale (dropdown),
Time Sig (คลิกเพื่อ cycle 6 รูปแบบ), BPM + tempo name (คลิกเพื่อพิมพ์),
Bar/Beat info

### `<MIDIStatusBar>`

แสดง: status dot + device name, live signal (CH/NOTE/CC/value),
filter meters (L/M/H 3 bars), preset buttons, expand เพื่อดู DDJ-GRV6 mapping reference

---

## DDJ-GRV6 MIDI Mapping

ที่มา: [Pioneer DDJ-GRV6 MIDI Message List PDF](https://www.pioneerdj.com/-/media/pioneerdj/software-info/controller/ddj-grv6/ddj-grv6_midi_message_list_e1.pdf)

### Deck Controls (แยกอิสระทั้งสอง deck)

| Control | Type | CH 1 → Deck A | CH 2 → Deck B |
|---------|------|:------------:|:------------:|
| Play/Pause | Note On | Note 11 `0x0B` | Note 11 `0x0B` |
| CUE | Note On | Note 12 `0x0C` | Note 12 `0x0C` |
| Sync | Note On | Note 88 `0x58` | Note 88 `0x58` |
| Loop In | Note On | Note 16 `0x10` | Note 16 `0x10` |
| Loop Out | Note On | Note 17 `0x11` | Note 17 `0x11` |
| Tempo Fader | CC MSB | CC 0 | CC 0 |
| Channel Volume | CC MSB | CC 8 | CC 8 |
| EQ HI | CC MSB | CC 5 | CC 5 |
| EQ MID | CC MSB | CC 11 | CC 11 |
| EQ LOW | CC MSB | CC 15 | CC 15 |
| Hot Cue Pad A | Note On | Note 0 | Note 0 |
| Hot Cue Pad B | Note On | Note 1 | Note 1 |
| Hot Cue Pad C–H | Note On | Note 2–7 | Note 2–7 |

### Global

| Control | MIDI CH | Type | ค่า |
|---------|---------|------|-----|
| Crossfader | CH 7 (index 6) | CC 31 | 0 = full A · 127 = full B |

### การแปลงค่า

| CC | แปลงเป็น | สูตร |
|----|----------|------|
| Tempo Fader (CC 0) | BPM | `origBpm × (1 + ((v−64)/64 × 0.08))` ≈ ±8% |
| Volume (CC 8) | Volume | `v / 127` → 0..1 |
| EQ HI/MID/LOW | dB | `((v−64) / 64) × 15` → −15..+15 dB |
| Crossfader (CC 31) | Mix | `v / 127` → 0..1 |

---

## การเพิ่ม Controller ใหม่

แก้ไขที่ `src/hooks/useMIDI.ts` เพิ่ม entry ใน `CONTROLLER_PRESETS`:

```typescript
export const CONTROLLER_PRESETS: Readonly<Record<string, ControllerPreset>> = {

  // เพิ่ม controller ใหม่ที่นี่
  'Mixtrack-Pro-FX': {
    name: 'Numark Mixtrack Pro FX',
    decks: [
      {
        channel: 0,                              // MIDI CH 1 = Deck A
        play:    { type: 'note', note: 0  },
        cue:     { type: 'note', note: 1  },
        tempo:   { type: 'cc',   cc: 3    },
        volume:  { type: 'cc',   cc: 8    },
        eqHigh:  { type: 'cc',   cc: 22   },
        eqMid:   { type: 'cc',   cc: 23   },
        eqLow:   { type: 'cc',   cc: 24   },
        hotCue:  [16, 17, 18, 19, 20, 21, 22, 23],
      },
      {
        channel: 1,                              // MIDI CH 2 = Deck B
        // ... ค่าเดิม channel ต่างกัน
        play:    { type: 'note', note: 0  },
        cue:     { type: 'note', note: 1  },
        tempo:   { type: 'cc',   cc: 3    },
        volume:  { type: 'cc',   cc: 8    },
        eqHigh:  { type: 'cc',   cc: 22   },
        eqMid:   { type: 'cc',   cc: 23   },
        eqLow:   { type: 'cc',   cc: 24   },
        hotCue:  [16, 17, 18, 19, 20, 21, 22, 23],
      },
    ],
    crossfader: { channel: 0, type: 'cc', cc: 9 },
  },

};
```

**วิธีหา Note/CC numbers ของ controller:**

1. เปิดแอป → Connect MIDI
2. กดปุ่มบน controller
3. ดู live signal ที่แถบ MIDI: `CH1 NOTE11:127` = Channel 1, Note 11
4. หมุน knob: `CH1 CC8:64` = Channel 1, CC 8, value 64
5. หรืออ่านจาก MIDI Message List PDF ของ manufacturer

---

## CSS Custom Properties

ทุก component ใช้ CSS variables ที่นิยามใน `src/index.css`:

```css
--bg:             #0d0d0f    /* background หลัก */
--surface:        #141416    /* card/panel background */
--panel:          #1a1a1e    /* nested panel */

--accent:         #c8f561    /* Deck A สีเขียว, highlight */
--accent2:        #61f5c8    /* secondary สีฟ้าอมเขียว */
--accent3:        #f561c8    /* CUE / playhead สีชมพู */

--text:           #f0f0e8    /* primary text */
--muted:          #6b6b72    /* secondary text, label */
--border:         #2a2a30    /* border, divider */

--font-mono:      'Space Mono', monospace
--font-display:   'Syne', sans-serif
```

**Deck B** ใช้ `#61c8f5` (ฟ้า) แทน `#c8f561` (เขียว) ของ Deck A

---

*Built with React 18 + TypeScript 5 · Web Audio API · Web MIDI API*
