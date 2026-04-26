import React, { useState } from 'react';
import { CONTROLLER_PRESETS } from '../hooks/useMIDI';

const HOT_CUE_COLORS = ['#f561c8', '#61f5c8', '#c8f561', '#f5a561', '#6185f5', '#f56161', '#a061f5', '#61d5f5'];
const HOT_CUE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function MIDIPanel({
  status, devices, mapping, learnTarget, lastSignal, filters,
  requestMIDI, applyPreset, clearBinding, resetMapping,
  startLearn, cancelLearn,
  hotCuePoints, onHotCueSet, onHotCueJump,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('controls'); // controls | learn | hotcue

  const connected = status === 'connected';
  const statusColor = {
    idle: 'var(--muted)',
    requesting: '#f5a561',
    connected: 'var(--accent)',
    'no-device': '#f5a561',
    unsupported: '#f56161',
    denied: '#f56161',
  }[status] || 'var(--muted)';

  const statusText = {
    idle: 'Not connected',
    requesting: 'Connecting…',
    connected: devices.length > 0 ? devices.map(d => d.name).join(', ') : 'Connected (no device)',
    'no-device': 'No MIDI device found',
    unsupported: 'MIDI not supported (use Chrome)',
    denied: 'Permission denied',
  }[status] || status;

  function bindingLabel(b) {
    if (!b) return <span style={{ color: 'var(--muted)', fontSize: 10 }}>— unassigned —</span>;
    if (b.type === 'note') return <code style={codeStyle}>CH{b.channel + 1} Note {b.note}</code>;
    if (b.type === 'cc')   return <code style={codeStyle}>CH{b.channel + 1} CC {b.cc}</code>;
  }

  function LearnBtn({ target, label }) {
    const isLearning = learnTarget === target;
    const binding = target.startsWith('hotCue_')
      ? mapping.hotCue?.[parseInt(target.split('_')[1])]
      : mapping[target];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
        <span style={{ width: 80, fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1 }}>{bindingLabel(binding)}</div>
        {isLearning ? (
          <button onClick={cancelLearn} style={{ ...btnStyle, borderColor: '#f56161', color: '#f56161', animation: 'pulse 1s infinite' }}>
            Cancel
          </button>
        ) : (
          <button onClick={() => startLearn(target)} style={{ ...btnStyle, borderColor: 'var(--accent2)', color: 'var(--accent2)' }}>
            Learn
          </button>
        )}
        {binding && (
          <button onClick={() => clearBinding(target)} style={{ ...btnStyle, borderColor: 'var(--border)', color: 'var(--muted)' }}>
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ margin: '0 0 0 0' }}>
      {/* ── Header bar ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 20px',
          borderTop: '0.5px solid var(--border)',
          borderBottom: open ? '0.5px solid var(--border)' : 'none',
          background: 'var(--surface)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: connected ? `0 0 6px ${statusColor}` : 'none', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          MIDI
        </span>
        <span style={{ fontSize: 10, color: statusColor, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {statusText}
        </span>
        {lastSignal && (
          <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            CC{lastSignal.byte1}:{lastSignal.byte2}
          </span>
        )}
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* ── Panel body ── */}
      {open && (
        <div style={{ background: 'var(--panel)', borderBottom: '0.5px solid var(--border)' }}>

          {/* Connect / Preset row */}
          <div style={{ padding: '10px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '0.5px solid var(--border)' }}>
            {status !== 'connected' && (
              <button onClick={requestMIDI} style={{ ...btnStyle, borderColor: 'var(--accent)', color: 'var(--accent)', padding: '6px 14px' }}>
                Connect MIDI
              </button>
            )}
            <span style={{ fontSize: 9, color: 'var(--muted)', marginRight: 4 }}>PRESET:</span>
            {Object.keys(CONTROLLER_PRESETS).map(k => (
              <button key={k} onClick={() => applyPreset(k)} style={{ ...btnStyle }}>
                {CONTROLLER_PRESETS[k].name}
              </button>
            ))}
            <button onClick={resetMapping} style={{ ...btnStyle, borderColor: '#f56161', color: '#f56161', marginLeft: 'auto' }}>
              Reset All
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
            {['controls', 'learn', 'hotcue'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '8px', fontSize: 10,
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                  background: tab === t ? 'rgba(200,245,97,0.07)' : 'transparent',
                  border: 'none', borderBottom: tab === t ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                  color: tab === t ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer', textTransform: 'uppercase',
                }}
              >
                {t === 'controls' ? 'Controls' : t === 'learn' ? 'MIDI Learn' : 'Hot Cues'}
              </button>
            ))}
          </div>

          {/* ── Tab: Controls (filter visualizer) ── */}
          {tab === 'controls' && (
            <div style={{ padding: '14px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <FilterKnob label="LOW" value={filters.low} color="#f5a561" />
                <FilterKnob label="MID" value={filters.mid} color="var(--accent2)" />
                <FilterKnob label="HIGH" value={filters.high} color="var(--accent)" />
              </div>
              <div style={{ marginTop: 14, fontSize: 10, color: 'var(--muted)' }}>
                Assign these knobs in MIDI Learn tab, then turn them on your controller.
              </div>
            </div>
          )}

          {/* ── Tab: MIDI Learn ── */}
          {tab === 'learn' && (
            <div style={{ padding: '10px 20px 14px' }}>
              {learnTarget && (
                <div style={{ padding: '8px 12px', marginBottom: 10, background: 'rgba(245,97,200,0.1)', border: '0.5px solid #f561c8', borderRadius: 6, fontSize: 11, color: '#f561c8' }}>
                  🎛 Waiting for MIDI input… press/turn a control on your controller
                </div>
              )}
              <LearnBtn target="play"      label="Play/Pause" />
              <LearnBtn target="cue"       label="Cue" />
              <LearnBtn target="bpm"       label="BPM (knob)" />
              <LearnBtn target="filterLow" label="Filter LOW" />
              <LearnBtn target="filterMid" label="Filter MID" />
              <LearnBtn target="filterHigh" label="Filter HIGH" />
              {HOT_CUE_LABELS.map((lbl, i) => (
                <LearnBtn key={i} target={`hotCue_${i}`} label={`Hot Cue ${lbl}`} />
              ))}
            </div>
          )}

          {/* ── Tab: Hot Cues ── */}
          {tab === 'hotcue' && (
            <div style={{ padding: '12px 20px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>
                Click SET to mark current position. Press the button (or its mapped MIDI key) to jump back.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {HOT_CUE_LABELS.map((lbl, i) => {
                  const point = hotCuePoints?.[i];
                  const color = HOT_CUE_COLORS[i];
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div
                        onClick={() => point != null && onHotCueJump?.(i)}
                        style={{
                          height: 44,
                          borderRadius: 6,
                          border: `0.5px solid ${point != null ? color : 'var(--border)'}`,
                          background: point != null ? `${color}18` : 'var(--surface)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          cursor: point != null ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                          gap: 2,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: point != null ? color : 'var(--muted)' }}>
                          {lbl}
                        </span>
                        {point != null && (
                          <span style={{ fontSize: 9, color, fontFamily: 'var(--font-mono)' }}>
                            {fmt(point)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => onHotCueSet?.(i)}
                          style={{ flex: 1, ...btnStyle, fontSize: 9, padding: '3px 0', borderColor: color, color }}
                        >
                          SET
                        </button>
                        {point != null && (
                          <button
                            onClick={() => onHotCueSet?.(i, true)}
                            style={{ ...btnStyle, fontSize: 9, padding: '3px 6px' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function FilterKnob({ label, value, color }) {
  const pct = (value / 127) * 100;
  const angle = -135 + (value / 127) * 270;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg viewBox="0 0 56 56" style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border)" strokeWidth="3" strokeDasharray="138 200" strokeDashoffset="-31" strokeLinecap="round" />
          <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${(pct / 100) * 138} 200`} strokeDashoffset="-31" strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.1s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color,
        }}>
          {Math.round((value / 127) * 100)}
        </div>
      </div>
      <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}>{label}</span>
    </div>
  );
}

function fmt(s) {
  if (s == null) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

const btnStyle = {
  background: 'transparent',
  border: '0.5px solid var(--border)',
  color: 'var(--muted)',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  padding: '4px 10px',
  borderRadius: 4,
  cursor: 'pointer',
  letterSpacing: '0.06em',
};

const codeStyle = {
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  color: 'var(--accent2)',
  background: 'rgba(97,245,200,0.08)',
  padding: '1px 6px',
  borderRadius: 3,
};
