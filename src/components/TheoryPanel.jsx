import React from 'react';
import { NOTE_NAMES, TIME_SIGNATURES, getTempoName, getScaleNotes, MODE_NAMES } from '../musicTheory';

const SCALE_OPTIONS = ['major', 'minor', 'dorian', 'pentatonic', 'blues'];

export default function TheoryPanel({
  rootKey, setRootKey,
  scaleName, setScaleName,
  bpm, setBpm,
  timeSigIdx, setTimeSigIdx,
  barInfo,
}) {
  const ts = TIME_SIGNATURES[timeSigIdx];
  const tempoName = getTempoName(bpm);
  const scaleNotes = getScaleNotes(rootKey, scaleName);
  const modeName = MODE_NAMES[scaleName] || scaleName;

  const handleKeyClick = () => {
    const idx = (rootKey + 1) % 12;
    setRootKey(idx);
  };

  const handleTimeSigClick = () => {
    setTimeSigIdx((timeSigIdx + 1) % TIME_SIGNATURES.length);
  };

  const handleBpmClick = () => {
    const val = prompt('Enter BPM (40–240):', bpm);
    const n = parseInt(val);
    if (!isNaN(n) && n >= 40 && n <= 240) setBpm(n);
  };

  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--border)' }}>
      {/* Key */}
      <TheoryBox label="Key" onClick={handleKeyClick} title="Click to change key">
        <div style={valStyle}>{NOTE_NAMES[rootKey]}</div>
        <div style={subStyle}>{modeName}</div>
      </TheoryBox>

      {/* Scale */}
      <TheoryBox label="Scale">
        <select
          value={scaleName}
          onChange={(e) => setScaleName(e.target.value)}
          style={{ ...valStyle, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', width: '100%', padding: 0 }}
        >
          {SCALE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <div style={subStyle}>{scaleNotes.join(' ')}</div>
      </TheoryBox>

      {/* Time Sig */}
      <TheoryBox label="Time" onClick={handleTimeSigClick} title="Click to change time signature">
        <div style={valStyle}>{ts.beats}/{ts.division}</div>
        <div style={subStyle}>{ts.name}</div>
      </TheoryBox>

      {/* BPM */}
      <TheoryBox label="BPM" onClick={handleBpmClick} title="Click to set BPM">
        <div style={valStyle}>{bpm}</div>
        <div style={subStyle}>{tempoName}</div>
      </TheoryBox>

      {/* Bar */}
      <TheoryBox label="Bar">
        <div style={valStyle}>{barInfo.currentBar} / {barInfo.totalBars}</div>
        <div style={subStyle}>Beat {barInfo.currentBeat}</div>
      </TheoryBox>
    </div>
  );
}

function TheoryBox({ label, children, onClick, title }) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        flex: 1,
        padding: '10px 12px',
        borderRight: '0.5px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
        minWidth: 0,
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'rgba(200,245,97,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const valStyle = {
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'var(--font-display)',
  color: 'var(--text)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const subStyle = {
  fontSize: 9,
  color: 'var(--muted)',
  marginTop: 2,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
