import React, { useState } from 'react';
import type { ReactElement } from 'react';
import type { MidiHandle, MidiStatus, DeckId, ControllerPreset } from '../types';

interface MIDIStatusBarProps {
  midi:        MidiHandle;
  activeDeck:  DeckId;
  presets:     Readonly<Record<string, ControllerPreset>>;
}

const STATUS_COLOR: Record<MidiStatus, string> = {
  idle:         'var(--muted)',
  requesting:   '#f5a561',
  connected:    'var(--accent)',
  'no-device':  '#f5a561',
  unsupported:  '#f56161',
  denied:       '#f56161',
};

export default function MIDIStatusBar({ midi, activeDeck, presets }: MIDIStatusBarProps): ReactElement {
  const [open, setOpen] = useState(false);
  const { status, devices, preset, lastSignal, filters, requestMIDI, applyPreset } = midi;

  const color  = STATUS_COLOR[status] ?? 'var(--muted)';
  const label  = {
    idle:        'MIDI — Not connected',
    requesting:  'Connecting…',
    connected:   devices.length ? `MIDI — ${devices[0]?.name ?? ''}` : 'Connected (no device)',
    'no-device': 'MIDI — No device found',
    unsupported: 'MIDI not supported (Chrome only)',
    denied:      'MIDI — Permission denied',
  }[status] ?? status;

  return (
    <div style={{ borderTop:'0.5px solid var(--border)' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 20px', background:'var(--surface)', cursor:'pointer', userSelect:'none' }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow: status==='connected' ? `0 0 5px ${color}` : 'none', flexShrink:0 }} />
        <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color, letterSpacing:'0.06em' }}>{label}</span>
        {lastSignal && <span style={{ fontSize:9, fontFamily:'var(--font-mono)', color:'var(--muted)', marginLeft:4 }}>CH{lastSignal.channel+1} {lastSignal.msgType===11?'CC':'NOTE'}{lastSignal.byte1}:{lastSignal.byte2}</span>}
        {status === 'connected' && (
          <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:8 }}>
            {([['L', filters.low, '#f5a561'], ['M', filters.mid, '#61f5c8'], ['H', filters.high, '#c8f561']] as const).map(([lbl, val, col]) => (
              <div key={lbl} style={{ display:'flex', alignItems:'center', gap:3 }}>
                <span style={{ fontSize:8, color:'var(--muted)' }}>{lbl}</span>
                <div style={{ width:28, height:3, background:'var(--border)', borderRadius:2 }}>
                  <div style={{ width:`${(val/127)*100}%`, height:'100%', background:col, borderRadius:2, transition:'width 0.05s' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <span style={{ marginLeft:'auto', fontSize:9, color:'var(--muted)' }}>{open?'▲':'▼'}</span>
      </div>

      {open && (
        <div style={{ background:'var(--panel)', borderBottom:'0.5px solid var(--border)', padding:'12px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {status !== 'connected' && <button onClick={requestMIDI} style={btnS('#c8f561')}>Connect MIDI</button>}
            <span style={{ fontSize:9, color:'var(--muted)' }}>PRESET:</span>
            {Object.keys(presets).map(k => (
              <button key={k} onClick={() => applyPreset(k)} style={btnS(preset===k ? '#61c8f5' : null)}>
                {presets[k]?.name ?? k}
              </button>
            ))}
          </div>
          {preset === 'DDJ-GRV6' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {([
                { label:'Deck A (MIDI CH 1)', items:['Play/Pause → Note 11','CUE → Note 12','Tempo Fader → CC 0','Volume → CC 8','EQ HI → CC 5','EQ MID → CC 11','EQ LOW → CC 15','Hot Cue A–H → Note 0–7'] },
                { label:'Deck B (MIDI CH 2)', items:['Play/Pause → Note 11','CUE → Note 12','Tempo Fader → CC 0','Volume → CC 8','EQ HI → CC 5','EQ MID → CC 11','EQ LOW → CC 15','Hot Cue A–H → Note 0–7'] },
              ] as const).map(({ label, items }) => (
                <div key={label} style={{ background:'rgba(255,255,255,0.02)', borderRadius:6, padding:'8px 10px', border:'0.5px solid var(--border)' }}>
                  <div style={{ fontSize:9, color:'var(--accent2)', letterSpacing:'0.08em', marginBottom:6, fontFamily:'var(--font-mono)' }}>{label}</div>
                  {items.map(item => <div key={item} style={{ fontSize:9, color:'var(--muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{item}</div>)}
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize:9, color:'var(--muted)', fontFamily:'var(--font-mono)', lineHeight:1.6 }}>
            <span style={{ color:'var(--accent2)' }}>Tempo (CC 0)</span> center 64 = original BPM · ±8% stretch &nbsp;·&nbsp;
            <span style={{ color:'var(--accent2)' }}>Volume (CC 8)</span> per deck, stacks with crossfader &nbsp;·&nbsp;
            <span style={{ color:'var(--accent2)' }}>Crossfader (CC 31, CH 7)</span> global
          </div>
        </div>
      )}
    </div>
  );
}

function btnS(active: string | null): React.CSSProperties {
  return { background: active ? `${active}18` : 'transparent', border:`0.5px solid ${active ?? 'var(--border)'}`, color: active ?? 'var(--muted)', fontSize:10, fontFamily:'var(--font-mono)', padding:'4px 10px', borderRadius:4, cursor:'pointer', letterSpacing:'0.06em', transition:'all 0.15s' };
}
