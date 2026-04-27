import type {
  NoteName, RootKeyIndex, ScaleName, TimeSig, DiatonicChord,
} from './types';

// ─── Note names ───────────────────────────────────────────────────────────────

export const NOTE_NAMES: readonly NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

// ─── Scales ───────────────────────────────────────────────────────────────────

export const SCALES: Readonly<Record<ScaleName, readonly number[]>> = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues:      [0, 3, 5, 6, 7, 10],
} as const;

// ─── Diatonic chord numerals ──────────────────────────────────────────────────

const CHORD_NUMERALS: Readonly<Record<ScaleName, readonly string[]>> = {
  major:      ['I',  'II',  'III', 'IV', 'V',  'VI',  'VII'],
  minor:      ['i',  'ii°', 'III', 'iv', 'v',  'VI',  'VII'],
  dorian:     ['i',  'ii',  'III', 'IV', 'v',  'vi°', 'VII'],
  pentatonic: ['I',  'II',  'III', 'V',  'VI'],
  blues:      ['I',  'III', 'IV',  'TT', 'V',  'VII'],
} as const;

const CHORD_QUALITIES: Readonly<Record<ScaleName, readonly string[]>> = {
  major:      ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'],
  minor:      ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'],
  dorian:     ['min', 'min', 'maj', 'maj', 'min', 'dim', 'maj'],
  pentatonic: ['sus', 'sus', 'sus', 'sus', 'sus'],
  blues:      ['dom7','min','dom7','dim','dom7','min7'],
} as const;

// ─── Time signatures ──────────────────────────────────────────────────────────

export const TIME_SIGNATURES: readonly TimeSig[] = [
  { beats: 4, division: 4, name: 'Common time'    },
  { beats: 3, division: 4, name: 'Waltz'           },
  { beats: 6, division: 8, name: 'Compound duple'  },
  { beats: 5, division: 4, name: 'Quintuple'       },
  { beats: 7, division: 8, name: 'Septuple'        },
  { beats: 2, division: 4, name: 'Cut time'        },
] as const;

// ─── Tempo marks ─────────────────────────────────────────────────────────────

const TEMPO_MARKS: ReadonlyArray<readonly [number, string]> = [
  [0,   'Grave'       ],
  [40,  'Largo'       ],
  [60,  'Larghetto'   ],
  [66,  'Adagio'      ],
  [76,  'Andante'     ],
  [108, 'Moderato'    ],
  [120, 'Allegro'     ],
  [156, 'Vivace'      ],
  [176, 'Presto'      ],
  [200, 'Prestissimo' ],
] as const;

export const MODE_NAMES: Readonly<Record<ScaleName, string>> = {
  major:      'Ionian',
  minor:      'Aeolian',
  dorian:     'Dorian',
  pentatonic: 'Pentatonic',
  blues:      'Blues',
} as const;

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function getTempoName(bpm: number): string {
  let name = 'Grave';
  for (const [threshold, label] of TEMPO_MARKS) {
    if (bpm >= threshold) name = label;
  }
  return name;
}

export function getScaleNotes(rootKey: RootKeyIndex, scale: ScaleName): NoteName[] {
  return SCALES[scale].map(i => NOTE_NAMES[(rootKey + i) % 12] as NoteName);
}

export function getDiatonicChords(
  rootKey: RootKeyIndex,
  scale: ScaleName,
): DiatonicChord[] {
  const intervals = SCALES[scale];
  const numerals  = CHORD_NUMERALS[scale];
  const qualities = CHORD_QUALITIES[scale];
  return intervals.map((interval, idx) => ({
    root:    NOTE_NAMES[(rootKey + interval) % 12] as NoteName,
    numeral: numerals[idx] ?? '',
    quality: qualities[idx] ?? 'maj',
  }));
}

export function getNextTimeSigIdx(current: number): number {
  return (current + 1) % TIME_SIGNATURES.length;
}
