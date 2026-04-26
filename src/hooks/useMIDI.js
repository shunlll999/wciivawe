import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Known controller presets ───────────────────────────────────────────────
//
// DDJ-GRV6 MIDI spec from Pioneer official MIDI message list:
//   Source: pioneerdj.com/.../ddj-grv6_midi_message_list_e1.pdf
//
// MIDI Channel layout (0-indexed):
//   CH 0 = Deck 1  |  CH 1 = Deck 2  |  CH 2 = Deck 3  |  CH 3 = Deck 4
//   CH 6 = Browse/Global section
//
// Deck controls (DECK 1 = CH 0 = 0x90):
//   PLAY/PAUSE  → Note 11  (0x0B)
//   CUE         → Note 12  (0x0C)
//   SYNC        → Note 88  (0x58)
//   LOOP IN     → Note 16  (0x10)
//   LOOP OUT    → Note 17  (0x11)
//   TEMPO (pitch fader) → CC 0 MSB + CC 32 LSB (14-bit)
//   EQ HI       → CC 5  MSB + CC 37 LSB (14-bit, on mixer channel)
//   EQ MID      → CC 11 MSB + CC 43 LSB (14-bit, on mixer channel)
//   EQ LOW      → CC 15 MSB + CC 47 LSB (14-bit, on mixer channel)
//   CHANNEL VOL → CC 8  MSB + CC 40 LSB (14-bit)
//
// Performance Pads — HOT CUE mode (Deck 1, CH 0, without Shift):
//   Pad 1 = Note 0  (0x00)   Pad 5 = Note 4  (0x04)
//   Pad 2 = Note 1  (0x01)   Pad 6 = Note 5  (0x05)
//   Pad 3 = Note 2  (0x02)   Pad 7 = Note 6  (0x06)
//   Pad 4 = Note 3  (0x03)   Pad 8 = Note 7  (0x07)
//
// NOTE: EQ knobs send 14-bit (MSB+LSB pair). For simplicity we listen to
// the MSB CC only and map 0–127 → filter value.

export const CONTROLLER_PRESETS = {
  'DDJ-GRV6': {
    name: 'Pioneer DDJ-GRV6',
    // Deck 1 = MIDI channel 0 (0x90)
    play:       { type: 'note', channel: 0, note: 11  }, // Note 0x0B
    cue:        { type: 'note', channel: 0, note: 12  }, // Note 0x0C
    // Tempo/pitch fader → CC 0 (MSB) on Deck 1
    bpm:        { type: 'cc',   channel: 0, cc: 0     }, // CC MSB (14-bit pair 0+32)
    // EQ knobs on mixer — Pioneer sends 14-bit; we read MSB CC only
    // Mixer channel 1 maps to MIDI ch 0 in Pioneer's scheme for EQ
    filterHigh: { type: 'cc',   channel: 0, cc: 5     }, // CC 5 (HI EQ MSB)
    filterMid:  { type: 'cc',   channel: 0, cc: 11    }, // CC 11 (MID EQ MSB)
    filterLow:  { type: 'cc',   channel: 0, cc: 15    }, // CC 15 (LOW EQ MSB)
    // Hot Cue pads 1–8 (HOT CUE mode, Deck 1, no shift)
    hotCue: [
      { type: 'note', channel: 0, note: 0 }, // Pad A (Note 0x00)
      { type: 'note', channel: 0, note: 1 }, // Pad B (Note 0x01)
      { type: 'note', channel: 0, note: 2 }, // Pad C (Note 0x02)
      { type: 'note', channel: 0, note: 3 }, // Pad D (Note 0x03)
      { type: 'note', channel: 0, note: 4 }, // Pad E (Note 0x04)
      { type: 'note', channel: 0, note: 5 }, // Pad F (Note 0x05)
      { type: 'note', channel: 0, note: 6 }, // Pad G (Note 0x06)
      { type: 'note', channel: 0, note: 7 }, // Pad H (Note 0x07)
    ],
  },

  // ── DDJ-200 (kept for reference) ────────────────────────────────────────
  'DDJ-200': {
    name: 'Pioneer DDJ-200',
    play:       { type: 'note', channel: 0, note: 11 },
    cue:        { type: 'note', channel: 0, note: 12 },
    bpm:        { type: 'cc',   channel: 0, cc: 14   },
    filterLow:  { type: 'cc',   channel: 0, cc: 70   },
    filterMid:  { type: 'cc',   channel: 0, cc: 71   },
    filterHigh: { type: 'cc',   channel: 0, cc: 72   },
    hotCue: [
      { type: 'note', channel: 0, note: 16 },
      { type: 'note', channel: 0, note: 17 },
      { type: 'note', channel: 0, note: 18 },
      { type: 'note', channel: 0, note: 19 },
      { type: 'note', channel: 0, note: 20 },
      { type: 'note', channel: 0, note: 21 },
      { type: 'note', channel: 0, note: 22 },
      { type: 'note', channel: 0, note: 23 },
    ],
  },
};

// ─── Default empty mapping ───────────────────────────────────────────────────
export const DEFAULT_MAPPING = {
  play:       null,
  cue:        null,
  bpm:        null,
  filterLow:  null,
  filterMid:  null,
  filterHigh: null,
  hotCue:     [null, null, null, null, null, null, null, null],
};

const STORAGE_KEY = 'music-visualizer-midi-mapping';

function loadMapping() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveMapping(mapping) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping)); } catch {}
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export default function useMIDI({ onPlay, onCue, onBpm, onFilterLow, onFilterMid, onFilterHigh, onHotCue }) {
  const [midiAccess, setMidiAccess] = useState(null);
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | requesting | connected | unsupported | denied
  const [mapping, setMapping] = useState(() => loadMapping() || DEFAULT_MAPPING);
  const [learnTarget, setLearnTarget] = useState(null); // 'play'|'cue'|'bpm'|'filterLow'|...|'hotCue_0'..
  const [lastSignal, setLastSignal] = useState(null);
  const [filters, setFilters] = useState({ low: 64, mid: 64, high: 64 }); // 0-127

  const mappingRef = useRef(mapping);
  const learnRef = useRef(learnTarget);
  const callbacksRef = useRef({ onPlay, onCue, onBpm, onFilterLow, onFilterMid, onFilterHigh, onHotCue });

  useEffect(() => { mappingRef.current = mapping; }, [mapping]);
  useEffect(() => { learnRef.current = learnTarget; }, [learnTarget]);
  useEffect(() => { callbacksRef.current = { onPlay, onCue, onBpm, onFilterLow, onFilterMid, onFilterHigh, onHotCue }; });

  // ── Match incoming MIDI message to a mapped action ──────────────────────
  const matchMapping = useCallback((data) => {
    const [status, byte1, byte2] = data;
    const channel = status & 0x0f;
    const type = status >> 4;
    // type 9 = note on, type 8 = note off, type 11 = control change
    const isNoteOn  = type === 9 && byte2 > 0;
    const isNoteOff = type === 8 || (type === 9 && byte2 === 0);
    const isCC      = type === 11;

    const m = mappingRef.current;
    const cb = callbacksRef.current;

    // Helper: does this message match a stored binding?
    function matches(binding) {
      if (!binding) return false;
      if (binding.type === 'note') return (isNoteOn || isNoteOff) && binding.channel === channel && binding.note === byte1;
      if (binding.type === 'cc')   return isCC && binding.channel === channel && binding.cc === byte1;
      return false;
    }

    if (isNoteOn && matches(m.play))  { cb.onPlay?.(); return 'play'; }
    if (isNoteOn && matches(m.cue))   { cb.onCue?.();  return 'cue';  }

    if (isCC && matches(m.bpm)) {
      // Map 0-127 → 60-180 BPM range
      const bpm = Math.round(60 + (byte2 / 127) * 120);
      cb.onBpm?.(bpm);
      return 'bpm';
    }
    if (isCC && matches(m.filterLow))  { setFilters(f => ({ ...f, low:  byte2 })); cb.onFilterLow?.(byte2);  return 'filterLow';  }
    if (isCC && matches(m.filterMid))  { setFilters(f => ({ ...f, mid:  byte2 })); cb.onFilterMid?.(byte2);  return 'filterMid';  }
    if (isCC && matches(m.filterHigh)) { setFilters(f => ({ ...f, high: byte2 })); cb.onFilterHigh?.(byte2); return 'filterHigh'; }

    for (let i = 0; i < (m.hotCue?.length || 0); i++) {
      if (isNoteOn && matches(m.hotCue[i])) {
        cb.onHotCue?.(i);
        return `hotCue_${i}`;
      }
    }

    return null;
  }, []);

  // ── Handle incoming MIDI message ─────────────────────────────────────────
  const handleMessage = useCallback((event) => {
    const [status, byte1, byte2] = event.data;
    const channel = status & 0x0f;
    const type = status >> 4;

    setLastSignal({ status, byte1, byte2, channel, type, ts: Date.now() });

    // LEARN MODE — capture next input and assign to target
    const target = learnRef.current;
    if (target) {
      const isNoteOn = type === 9 && byte2 > 0;
      const isCC     = type === 11;
      if (!isNoteOn && !isCC) return;

      const binding = isNoteOn
        ? { type: 'note', channel, note: byte1 }
        : { type: 'cc',   channel, cc: byte1   };

      setMapping(prev => {
        let next;
        if (target.startsWith('hotCue_')) {
          const idx = parseInt(target.split('_')[1]);
          const hotCue = [...(prev.hotCue || [])];
          hotCue[idx] = binding;
          next = { ...prev, hotCue };
        } else {
          next = { ...prev, [target]: binding };
        }
        saveMapping(next);
        return next;
      });
      setLearnTarget(null);
      return;
    }

    matchMapping(event.data);
  }, [matchMapping]);

  // ── Connect / disconnect devices ─────────────────────────────────────────
  const connectDevices = useCallback((access) => {
    const devList = [];
    access.inputs.forEach(input => {
      input.onmidimessage = handleMessage;
      devList.push({ id: input.id, name: input.name, manufacturer: input.manufacturer });

      // Auto-detect known controller and apply preset
      // DDJ-GRV6 reports its name as "DDJ-GRV6" in Web MIDI API
      const presetKey = Object.keys(CONTROLLER_PRESETS).find(k =>
        input.name?.includes(k) || input.name?.replace(/\s/g,'').toUpperCase().includes(k.replace(/\s/g,'').toUpperCase())
      );
      if (presetKey && !loadMapping()) {
        const preset = CONTROLLER_PRESETS[presetKey];
        const auto = {
          play: preset.play,
          cue: preset.cue,
          bpm: preset.bpm,
          filterLow: preset.filterLow,
          filterMid: preset.filterMid,
          filterHigh: preset.filterHigh,
          hotCue: preset.hotCue,
        };
        setMapping(auto);
        saveMapping(auto);
      }
    });
    setDevices(devList);
    setStatus(devList.length > 0 ? 'connected' : 'no-device');
  }, [handleMessage]);

  // ── Request MIDI access ──────────────────────────────────────────────────
  const requestMIDI = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      setMidiAccess(access);
      connectDevices(access);
      access.onstatechange = () => connectDevices(access);
      setStatus('connected');
    } catch {
      setStatus('denied');
    }
  }, [connectDevices]);

  // ── Apply a preset ───────────────────────────────────────────────────────
  const applyPreset = useCallback((presetKey) => {
    const preset = CONTROLLER_PRESETS[presetKey];
    if (!preset) return;
    const next = {
      play: preset.play,
      cue: preset.cue,
      bpm: preset.bpm,
      filterLow: preset.filterLow,
      filterMid: preset.filterMid,
      filterHigh: preset.filterHigh,
      hotCue: preset.hotCue,
    };
    setMapping(next);
    saveMapping(next);
  }, []);

  // ── Clear a binding ──────────────────────────────────────────────────────
  const clearBinding = useCallback((target) => {
    setMapping(prev => {
      let next;
      if (target.startsWith('hotCue_')) {
        const idx = parseInt(target.split('_')[1]);
        const hotCue = [...(prev.hotCue || [])];
        hotCue[idx] = null;
        next = { ...prev, hotCue };
      } else {
        next = { ...prev, [target]: null };
      }
      saveMapping(next);
      return next;
    });
  }, []);

  // ── Reset all mappings ───────────────────────────────────────────────────
  const resetMapping = useCallback(() => {
    setMapping(DEFAULT_MAPPING);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    status, devices, mapping, learnTarget, lastSignal, filters,
    requestMIDI, applyPreset, clearBinding, resetMapping,
    startLearn: setLearnTarget,
    cancelLearn: () => setLearnTarget(null),
  };
}
