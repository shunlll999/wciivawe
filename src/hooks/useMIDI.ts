import { useState, useRef, useCallback } from 'react';
import type {
  MidiHandle, MidiDeckCallbacks, MidiStatus, MidiDevice,
  MidiSignal, PresetKey, ControllerPreset,
} from '../types';
import { midiToVolume, midiToEq, midiToBpm, midiToCrossfader } from '../utils';

// ─── DDJ-GRV6 Official Preset ─────────────────────────────────────────────────
// Source: pioneerdj.com MIDI message list PDF (ddj-grv6_midi_message_list_e1.pdf)
//
// MIDI channels (0-indexed):
//   CH 0 = Deck 1   CH 1 = Deck 2   CH 6 = Browse/Global
//
// Buttons (Note On/Off):
//   PLAY/PAUSE  Note 11 (0x0B)    CUE         Note 12 (0x0C)
//   SYNC        Note 88 (0x58)    LOOP IN     Note 16 (0x10)
//   LOOP OUT    Note 17 (0x11)
//   Hot Cue Pads 1-8 = Note 0-7 (HOT CUE mode, no shift)
//
// Knobs / Faders (CC):
//   Tempo fader   CC 0  (14-bit MSB; range ±8%)
//   Channel Vol   CC 8  (14-bit MSB)
//   EQ HI         CC 5  (14-bit MSB)
//   EQ MID        CC 11 (14-bit MSB)
//   EQ LOW        CC 15 (14-bit MSB)
//   Crossfader    CC 31 (CH 6)

export const CONTROLLER_PRESETS: Readonly<Record<string, ControllerPreset>> = {
  'DDJ-GRV6': {
    name: 'Pioneer DDJ-GRV6',
    decks: [
      {
        channel: 0,
        play:    { type: 'note', note: 11 },
        cue:     { type: 'note', note: 12 },
        sync:    { type: 'note', note: 88 },
        loopIn:  { type: 'note', note: 16 },
        loopOut: { type: 'note', note: 17 },
        tempo:   { type: 'cc',   cc: 0    },
        volume:  { type: 'cc',   cc: 8    },
        eqHigh:  { type: 'cc',   cc: 5    },
        eqMid:   { type: 'cc',   cc: 11   },
        eqLow:   { type: 'cc',   cc: 15   },
        hotCue:  [0, 1, 2, 3, 4, 5, 6, 7],
      },
      {
        channel: 1,
        play:    { type: 'note', note: 11 },
        cue:     { type: 'note', note: 12 },
        sync:    { type: 'note', note: 88 },
        loopIn:  { type: 'note', note: 16 },
        loopOut: { type: 'note', note: 17 },
        tempo:   { type: 'cc',   cc: 0    },
        volume:  { type: 'cc',   cc: 8    },
        eqHigh:  { type: 'cc',   cc: 5    },
        eqMid:   { type: 'cc',   cc: 11   },
        eqLow:   { type: 'cc',   cc: 15   },
        hotCue:  [0, 1, 2, 3, 4, 5, 6, 7],
      },
    ],
    crossfader: { channel: 6, type: 'cc', cc: 31 },
  },
  'DDJ-400': {
    name: 'Pioneer DDJ-400',
    decks: [
      {
        channel: 0,
        play:   { type: 'note', note: 11 }, cue:    { type: 'note', note: 12 },
        tempo:  { type: 'cc',   cc: 0    }, volume: { type: 'cc',   cc: 8    },
        eqHigh: { type: 'cc',   cc: 5    }, eqMid:  { type: 'cc',   cc: 11   },
        eqLow:  { type: 'cc',   cc: 15   }, hotCue: [0,1,2,3,4,5,6,7],
      },
      {
        channel: 1,
        play:   { type: 'note', note: 11 }, cue:    { type: 'note', note: 12 },
        tempo:  { type: 'cc',   cc: 0    }, volume: { type: 'cc',   cc: 8    },
        eqHigh: { type: 'cc',   cc: 5    }, eqMid:  { type: 'cc',   cc: 11   },
        eqLow:  { type: 'cc',   cc: 15   }, hotCue: [0,1,2,3,4,5,6,7],
      },
    ],
    crossfader: { channel: 6, type: 'cc', cc: 31 },
  },
} as const;

type MidiAction =
  | 'play' | 'cue' | 'tempo' | 'volume'
  | 'eqHigh' | 'eqMid' | 'eqLow'
  | 'hotCue' | 'crossfader';

export default function useMIDI(callbacks: MidiDeckCallbacks): MidiHandle {
  const [status,     setStatus]     = useState<MidiStatus>('idle');
  const [devices,    setDevices]    = useState<MidiDevice[]>([]);
  const [preset,     setPreset]     = useState<PresetKey>('DDJ-GRV6');
  const [learnTarget, setLearnTarget] = useState<string | null>(null);
  const [lastSignal, setLastSignal] = useState<MidiSignal | null>(null);
  const [filters,    setFilters]    = useState({ low: 64, mid: 64, high: 64 });

  const cbRef       = useRef(callbacks);
  const presetRef   = useRef(preset);
  const origBpmsRef = useRef(callbacks.deckOrigBpms ?? ([120, 120] as const));

  cbRef.current       = callbacks;
  presetRef.current   = preset;
  origBpmsRef.current = callbacks.deckOrigBpms ?? ([120, 120] as const);

  // ── Dispatch ──────────────────────────────────────────────────────────
  const dispatch = useCallback((
    action: MidiAction,
    deckIdx: number,
    value: number,
  ): void => {
    const cb = cbRef.current;
    switch (action) {
      case 'play':
        cb.onDeckPlay?.(deckIdx);
        if (deckIdx === 0) cb.onPlay?.();
        break;
      case 'cue':
        cb.onDeckCue?.(deckIdx);
        if (deckIdx === 0) cb.onCue?.();
        break;
      case 'tempo': {
        const origBpm = origBpmsRef.current[deckIdx] ?? 120;
        const newBpm  = midiToBpm(value, origBpm);
        cb.onDeckBpm?.(deckIdx, newBpm);
        if (deckIdx === 0) cb.onBpm?.(newBpm);
        break;
      }
      case 'volume':
        cb.onDeckVolume?.(deckIdx, midiToVolume(value));
        break;
      case 'eqHigh': {
        const db = midiToEq(value);
        cb.onDeckEqHigh?.(deckIdx, db);
        if (deckIdx === 0) { cb.onFilterHigh?.(value); setFilters(f => ({ ...f, high: value })); }
        break;
      }
      case 'eqMid': {
        const db = midiToEq(value);
        cb.onDeckEqMid?.(deckIdx, db);
        if (deckIdx === 0) { cb.onFilterMid?.(value); setFilters(f => ({ ...f, mid: value })); }
        break;
      }
      case 'eqLow': {
        const db = midiToEq(value);
        cb.onDeckEqLow?.(deckIdx, db);
        if (deckIdx === 0) { cb.onFilterLow?.(value); setFilters(f => ({ ...f, low: value })); }
        break;
      }
      case 'hotCue':
        cb.onDeckHotCue?.(deckIdx, value);
        if (deckIdx === 0) cb.onHotCue?.(value);
        break;
      case 'crossfader':
        cb.onCrossfader?.(midiToCrossfader(value));
        break;
    }
  }, []);

  // ── Handle MIDI message ────────────────────────────────────────────────
  const handleMessage = useCallback((event: MIDIMessageEvent): void => {
    const data = event.data;
    if (!data || data.length < 3) return;

    const statusByte = data[0] ?? 0;
    const byte1 = data[1] ?? 0;
    const byte2 = data[2] ?? 0;
    const channel = statusByte & 0x0f;
    const msgType = statusByte >> 4;   // 9=noteOn, 8=noteOff, 11=CC

    const isNoteOn = msgType === 9 && byte2 > 0;
    const isCC     = msgType === 11;

    setLastSignal({ channel, msgType, byte1, byte2, ts: Date.now() });

    const p = CONTROLLER_PRESETS[presetRef.current] ?? CONTROLLER_PRESETS['DDJ-GRV6'];
    if (!p) return;

    // Per-deck matching
    for (let di = 0; di < p.decks.length; di++) {
      const d = p.decks[di];
      if (!d || channel !== d.channel) continue;

      if (isNoteOn) {
        if (byte1 === d.play.note)  { dispatch('play', di, byte2); return; }
        if (byte1 === d.cue.note)   { dispatch('cue',  di, byte2); return; }
        const padIdx = d.hotCue.indexOf(byte1);
        if (padIdx >= 0) { dispatch('hotCue', di, padIdx); return; }
      }

      if (isCC) {
        if (byte1 === d.tempo.cc)  { dispatch('tempo',  di, byte2); return; }
        if (byte1 === d.volume.cc) { dispatch('volume', di, byte2); return; }
        if (byte1 === d.eqHigh.cc) { dispatch('eqHigh', di, byte2); return; }
        if (byte1 === d.eqMid.cc)  { dispatch('eqMid',  di, byte2); return; }
        if (byte1 === d.eqLow.cc)  { dispatch('eqLow',  di, byte2); return; }
      }
    }

    // Global crossfader
    const xf = p.crossfader;
    if (isCC && channel === xf.channel && byte1 === xf.cc) {
      dispatch('crossfader', -1, byte2);
    }
  }, [dispatch]);

  // ── Connect devices ────────────────────────────────────────────────────
  const connectDevices = useCallback((access: MIDIAccess): void => {
    const devList: MidiDevice[] = [];
    access.inputs.forEach(input => {
      input.onmidimessage = handleMessage;
      devList.push({
        id: input.id,
        name: input.name ?? 'Unknown',
        manufacturer: input.manufacturer ?? '',
      });
      // Auto-detect preset
      const match = Object.keys(CONTROLLER_PRESETS).find(k =>
        input.name?.toUpperCase().includes(k.replace('-', '').toUpperCase()) ||
        input.name?.includes(k),
      );
      if (match) setPreset(match);
    });
    setDevices(devList);
    setStatus(devList.length > 0 ? 'connected' : 'no-device');
  }, [handleMessage]);

  // ── Request MIDI access ────────────────────────────────────────────────
  const requestMIDI = useCallback(async (): Promise<void> => {
    if (!navigator.requestMIDIAccess) { setStatus('unsupported'); return; }
    setStatus('requesting');
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      connectDevices(access);
      access.onstatechange = (): void => connectDevices(access);
    } catch {
      setStatus('denied');
    }
  }, [connectDevices]);

  const applyPreset = useCallback((key: PresetKey): void => {
    setPreset(key);
  }, []);

  return {
    status, devices, preset, learnTarget, lastSignal, filters,
    requestMIDI, applyPreset,
    startLearn: setLearnTarget,
    cancelLearn: (): void => setLearnTarget(null),
    mapping: null,
    resetMapping: (): void => {},
    clearBinding: (): void => {},
    hotCuePoints: [],
  };
}
