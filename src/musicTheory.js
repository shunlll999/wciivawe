export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
};

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_NUMERALS = {
  major: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'],
  minor: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
  dorian: ['i', 'ii', 'III', 'IV', 'v', 'vi°', 'VII'],
  pentatonic: ['I', 'II', 'III', 'V', 'VI'],
  blues: ['I', 'III', 'IV', 'TT', 'V', 'VII'],
};

export const CHORD_QUALITIES = {
  major: ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'],
  minor: ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'],
  dorian: ['min', 'min', 'maj', 'maj', 'min', 'dim', 'maj'],
  pentatonic: ['sus', 'sus', 'sus', 'sus', 'sus'],
  blues: ['dom7', 'min', 'dom7', 'dim', 'dom7', 'min7'],
};

export const TIME_SIGNATURES = [
  { beats: 4, division: 4, name: 'Common time' },
  { beats: 3, division: 4, name: 'Waltz' },
  { beats: 6, division: 8, name: 'Compound duple' },
  { beats: 5, division: 4, name: 'Quintuple' },
  { beats: 7, division: 8, name: 'Septuple' },
  { beats: 2, division: 4, name: 'Cut time' },
];

export const TEMPO_MARKS = [
  [0, 'Grave'],
  [40, 'Largo'],
  [60, 'Larghetto'],
  [66, 'Adagio'],
  [76, 'Andante'],
  [108, 'Moderato'],
  [120, 'Allegro'],
  [156, 'Vivace'],
  [176, 'Presto'],
  [200, 'Prestissimo'],
];

export const MODE_NAMES = {
  major: 'Ionian',
  minor: 'Aeolian',
  dorian: 'Dorian',
  pentatonic: 'Pentatonic',
  blues: 'Blues',
};

export function getTempoName(bpm) {
  let name = 'Grave';
  for (const [threshold, label] of TEMPO_MARKS) {
    if (bpm >= threshold) name = label;
  }
  return name;
}

export function getScaleNotes(rootKey, scaleName) {
  const intervals = SCALES[scaleName] || SCALES.major;
  return intervals.map((i) => NOTE_NAMES[(rootKey + i) % 12]);
}

export function getDiatonicChords(rootKey, scaleName) {
  const intervals = SCALES[scaleName] || SCALES.major;
  const numerals = CHORD_NUMERALS[scaleName] || CHORD_NUMERALS.major;
  const qualities = CHORD_QUALITIES[scaleName] || CHORD_QUALITIES.major;
  return intervals.map((interval, idx) => ({
    root: NOTE_NAMES[(rootKey + interval) % 12],
    numeral: numerals[idx],
    quality: qualities[idx] || 'maj',
  }));
}

export function detectBPMFromBuffer(buffer) {
  const ch = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const win = sr * 0.01;
  const energy = [];
  for (let i = 0; i < ch.length - win; i += win) {
    let e = 0;
    for (let j = 0; j < win; j++) e += ch[i + j] * ch[i + j];
    energy.push(e);
  }
  const avg = energy.reduce((a, b) => a + b, 0) / energy.length;
  let peaks = 0;
  let lastPeak = -100;
  for (let i = 1; i < energy.length - 1; i++) {
    if (energy[i] > avg * 1.5 && energy[i] > energy[i - 1] && energy[i] > energy[i + 1] && i - lastPeak > 8) {
      peaks++;
      lastPeak = i;
    }
  }
  let guessed = Math.round(peaks / (buffer.duration / 60));
  if (guessed < 60) guessed *= 2;
  if (guessed > 200) guessed = Math.round(guessed / 2);
  return guessed >= 60 && guessed <= 200 ? guessed : 120;
}

export function buildWaveData(buffer, points = 600) {
  const ch = buffer.getChannelData(0);
  const step = Math.floor(ch.length / points);
  const data = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const v = Math.abs(ch[i * step + j] || 0);
      if (v > max) max = v;
    }
    data[i] = max;
  }
  return data;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
