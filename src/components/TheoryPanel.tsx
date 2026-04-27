import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { NOTE_NAMES, TIME_SIGNATURES, getTempoName, getScaleNotes, MODE_NAMES } from '../musicTheory';
import type { RootKeyIndex, ScaleName, BarInfo } from '../types';

const SCALE_OPTIONS: ScaleName[] = ['major', 'minor', 'dorian', 'pentatonic', 'blues'];

interface TheoryPanelProps {
  rootKey: RootKeyIndex; setRootKey: (k: RootKeyIndex) => void;
  scaleName: ScaleName;  setScaleName: (s: ScaleName) => void;
  bpm: number;           setBpm: (b: number) => void;
  timeSigIdx: number;    setTimeSigIdx: (i: number) => void;
  barInfo: BarInfo;
}

export default function TheoryPanel({ rootKey, setRootKey, scaleName, setScaleName, bpm, setBpm, timeSigIdx, setTimeSigIdx, barInfo }: TheoryPanelProps): ReactElement {
  const ts         = TIME_SIGNATURES[timeSigIdx];
  const tempoName  = getTempoName(bpm);
  const scaleNotes = getScaleNotes(rootKey, scaleName);
  const modeName   = MODE_NAMES[scaleName] ?? scaleName;

  return (
    <div style={{ display:'flex', gap:0, borderBottom:'0.5px solid var(--border)' }}>
      <TheoryBox label="Key" onClick={() => setRootKey(((rootKey + 1) % 12) as RootKeyIndex)} title="Click to cycle key">
        <div style={valS}>{NOTE_NAMES[rootKey]}</div>
        <div style={subS}>{modeName}</div>
      </TheoryBox>

      <TheoryBox label="Scale">
        <select value={scaleName} onChange={e => setScaleName(e.target.value as ScaleName)}
          style={{ ...valS, background:'transparent', border:'none', outline:'none', cursor:'pointer', width:'100%', padding:0 }}>
          {SCALE_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div style={subS}>{scaleNotes.join(' ')}</div>
      </TheoryBox>

      <TheoryBox label="Time" onClick={() => setTimeSigIdx((timeSigIdx + 1) % TIME_SIGNATURES.length)} title="Click to cycle time signature">
        {ts ? <><div style={valS}>{ts.beats}/{ts.division}</div><div style={subS}>{ts.name}</div></> : <div style={valS}>—</div>}
      </TheoryBox>

      <TheoryBox label="BPM" onClick={() => { const v = prompt('BPM (40–240):', String(bpm)); const n = parseInt(v ?? ''); if (!isNaN(n) && n >= 40 && n <= 240) setBpm(n); }} title="Click to set BPM">
        <div style={valS}>{bpm}</div>
        <div style={subS}>{tempoName}</div>
      </TheoryBox>

      <TheoryBox label="Bar">
        <div style={valS}>{barInfo.currentBar} / {barInfo.totalBars}</div>
        <div style={subS}>Beat {barInfo.currentBeat}</div>
      </TheoryBox>
    </div>
  );
}

interface TheoryBoxProps { label: string; children: ReactNode; onClick?: () => void; title?: string; }

function TheoryBox({ label, children, onClick, title }: TheoryBoxProps): ReactElement {
  return (
    <div onClick={onClick} title={title} style={{ flex:1, padding:'10px 12px', borderRight:'0.5px solid var(--border)', cursor: onClick ? 'pointer' : 'default', transition:'background 0.15s', minWidth:0 }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = 'rgba(200,245,97,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      {children}
    </div>
  );
}

const valS: React.CSSProperties = { fontSize:14, fontWeight:700, fontFamily:'var(--font-display)', color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' };
const subS: React.CSSProperties = { fontSize:9, color:'var(--muted)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' };
