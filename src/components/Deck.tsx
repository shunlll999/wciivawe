import React, { useCallback } from 'react';
import type { ReactElement } from 'react';
import WaveformCanvas from './WaveformCanvas';
import BarGrid from './BarGrid';
import type { DeckHandle, TimeSig, BarInfo, EqState } from '../types';
import { formatTime } from '../utils';

const HOT_CUE_COLORS = ['#f561c8','#61f5c8','#c8f561','#f5a561','#6185f5','#f56161','#a061f5','#61d5f5'];
const HOT_CUE_LABELS = ['A','B','C','D','E','F','G','H'];

// ─── Prop types ───────────────────────────────────────────────────────────────

interface DeckProps {
  deckId:     'A' | 'B';
  deck:       DeckHandle;
  timeSig:    TimeSig;
  onBarInfo:  (info: BarInfo) => void;
  isActive:   boolean;
  onActivate: () => void;
}

interface TransBtnProps {
  children:  React.ReactNode;
  onClick:   () => void;
  disabled?: boolean;
  color?:    string | null;
  active?:   boolean;
  title?:    string;
}

interface EQFaderProps {
  label:    string;
  color:    string;
  value:    number;
  onChange: (v: number) => void;
  disabled: boolean;
}

// ─── Deck ─────────────────────────────────────────────────────────────────────

export default function Deck({
  deckId, deck, timeSig, onBarInfo, isActive, onActivate,
}: DeckProps): ReactElement {
  const accentColor = deckId === 'A' ? '#c8f561' : '#61c8f5';
  const accentRgb   = deckId === 'A' ? '200,245,97' : '97,200,245';

  // ── Drag & drop ────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault(); e.stopPropagation();
    deck.setIsDragOver(true);
  }, [deck]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    deck.setIsDragOver(false);
  }, [deck]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault(); e.stopPropagation();
    deck.setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) { deck.loadFile(file); return; }
    const dragged = (window as Window & { __draggedTrackFile?: File }).__draggedTrackFile;
    if (dragged) { deck.loadFile(dragged); delete (window as Window & { __draggedTrackFile?: File }).__draggedTrackFile; }
  }, [deck]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    deck.seek(ratio);
  }, [deck]);

  const isEmpty = !deck.isLoaded;

  return (
    <div
      onClick={onActivate}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ flex:1, minWidth:0, background:'var(--bg)', border:`0.5px solid ${isActive ? accentColor : 'var(--border)'}`, borderRadius:10, overflow:'hidden', transition:'border-color 0.2s', position:'relative', boxShadow: isActive ? `0 0 0 1px ${accentColor}22` : 'none' }}
    >
      {/* Drag overlay */}
      {deck.isDragOver && (
        <div style={{ position:'absolute', inset:0, zIndex:10, background:`rgba(${accentRgb},0.12)`, border:`2px dashed ${accentColor}`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <span style={{ fontSize:13, color:accentColor, fontFamily:'var(--font-mono)', letterSpacing:'0.1em' }}>DROP TO LOAD DECK {deckId}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ background:'var(--surface)', padding:'8px 14px', display:'flex', alignItems:'center', gap:10, borderBottom:'0.5px solid var(--border)' }}>
        <div style={{ width:22, height:22, borderRadius:'50%', background:`rgba(${accentRgb},0.15)`, border:`0.5px solid ${accentColor}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:10, fontWeight:700, color:accentColor, fontFamily:'var(--font-display)' }}>{deckId}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color: isEmpty ? 'var(--muted)' : 'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {isEmpty ? `Deck ${deckId} — drop track here` : deck.fileName}
          </div>
          {!isEmpty && <div style={{ fontSize:9, color:'var(--muted)', marginTop:1 }}>{formatTime(deck.currentTime)} / {formatTime(deck.duration)}</div>}
        </div>

        {/* BPM — clickable */}
        <div style={{ textAlign:'right', flexShrink:0, cursor:'pointer' }}
          title="Click to set BPM · Tempo fader on DDJ-GRV6 (CC 0) also controls this"
          onClick={() => { const v = prompt(`Deck ${deckId} BPM (40-250):`, String(deck.bpm)); const n = parseFloat(v ?? ''); if (!isNaN(n) && n >= 40 && n <= 250) deck.setBpm(n); }}
        >
          <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-display)', color:accentColor, lineHeight:1 }}>{deck.bpm}</div>
          <div style={{ fontSize:8, color:'var(--muted)', letterSpacing:'0.06em' }}>BPM</div>
          {deck.originalBpm > 0 && deck.bpm !== deck.originalBpm && (
            <div style={{ fontSize:7, color:accentColor, opacity:0.7, marginTop:1 }}>orig {deck.originalBpm}</div>
          )}
        </div>

        {/* Playing dot */}
        <div style={{ width:6, height:6, borderRadius:'50%', background: deck.isPlaying ? accentColor : 'var(--muted)', boxShadow: deck.isPlaying ? `0 0 6px ${accentColor}` : 'none', flexShrink:0, transition:'all 0.2s' }} />
      </div>

      {/* Tempo slider */}
      {!isEmpty && (
        <div style={{ padding:'4px 12px 0', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:8, color:'var(--muted)', width:30, flexShrink:0 }}>TEMPO</span>
          <input type="range"
            min={Math.max(40, Math.round((deck.originalBpm || deck.bpm) * 0.85))}
            max={Math.min(250, Math.round((deck.originalBpm || deck.bpm) * 1.15))}
            step="0.5"
            value={deck.bpm}
            onChange={e => deck.setBpm(parseFloat(e.target.value))}
            onDoubleClick={() => deck.setBpm(deck.originalBpm || deck.bpm)}
            title="Tempo stretch · double-click = reset"
            style={{ flex:1, accentColor }}
          />
          <button onClick={() => deck.setBpm(deck.originalBpm || deck.bpm)}
            style={{ fontSize:8, color:'var(--muted)', background:'transparent', border:'0.5px solid var(--border)', borderRadius:3, padding:'1px 5px', cursor:'pointer' }}>RST</button>
          <span style={{ fontSize:9, color:accentColor, fontFamily:'var(--font-mono)', width:34, textAlign:'right', flexShrink:0 }}>
            {deck.originalBpm > 0 && deck.bpm !== deck.originalBpm
              ? `${((deck.bpm / deck.originalBpm - 1) * 100).toFixed(1)}%`
              : '±0%'}
          </span>
        </div>
      )}

      {/* Waveform */}
      <div style={{ padding:'10px 12px 4px' }}>
        <WaveformCanvas waveData={deck.waveData} liveData={deck.liveData} progress={deck.progress} accentColor={accentColor} />
      </div>

      {/* Progress bar */}
      <div style={{ padding:'0 12px 6px' }}>
        <div onClick={handleSeek} style={{ height:3, background:'var(--border)', borderRadius:2, cursor:'pointer', position:'relative' }}>
          <div style={{ height:'100%', width:`${deck.progress * 100}%`, background:accentColor, borderRadius:2, transition:'width 0.05s linear' }} />
          {deck.hotCues.map((pt, i) => pt != null && deck.duration > 0 ? (
            <div key={i} onClick={ev => { ev.stopPropagation(); deck.jumpHotCue(i); }}
              style={{ position:'absolute', top:-2, left:`${(pt / deck.duration) * 100}%`, width:2, height:7, background: HOT_CUE_COLORS[i] ?? '#fff', borderRadius:1, cursor:'pointer', transform:'translateX(-50%)' }}
              title={`Hot Cue ${HOT_CUE_LABELS[i] ?? i}`}
            />
          ) : null)}
        </div>
      </div>

      {/* Bar Grid */}
      <div style={{ padding:'0 12px 8px' }}>
        <BarGrid duration={deck.duration} bpm={deck.bpm} timeSig={timeSig} progress={deck.progress} onBarInfo={onBarInfo} accentColor={accentColor} />
      </div>

      {/* Transport */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px 8px', borderTop:'0.5px solid var(--border)', borderBottom:'0.5px solid var(--border)', background:'var(--surface)' }}>
        <TransBtn color="#f561c8" disabled={isEmpty} onClick={deck.cue} title="CUE">CUE</TransBtn>
        <button onClick={deck.togglePlay} disabled={isEmpty}
          style={{ width:34, height:34, borderRadius:'50%', background: deck.isPlaying ? accentColor : `rgba(${accentRgb},0.15)`, border:`0.5px solid ${accentColor}`, cursor: isEmpty ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s', opacity: isEmpty ? 0.4 : 1 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={deck.isPlaying ? 'var(--bg)' : accentColor}>
            {deck.isPlaying ? <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></> : <polygon points="5,3 19,12 5,21"/>}
          </svg>
        </button>
        <TransBtn color={deck.loopOn ? accentColor : null} disabled={isEmpty} onClick={deck.toggleLoop} active={deck.loopOn} title="Loop">⟳</TransBtn>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:8, color:'var(--muted)', letterSpacing:'0.06em' }}>VOL</span>
        <input type="range" min="0" max="1" step="0.01" value={deck.volume}
          onChange={e => deck.setVolume(parseFloat(e.target.value))}
          style={{ width:55, accentColor }}
          title={`Volume ${Math.round(deck.volume * 100)}%`}
        />
      </div>

      {/* 3-band EQ */}
      <div style={{ padding:'8px 12px', display:'flex', gap:8, alignItems:'flex-end' }}>
        {([
          { band: 'high' as keyof EqState, label:'HI',  color:'#c8f561' },
          { band: 'mid'  as keyof EqState, label:'MID', color:'#61f5c8' },
          { band: 'low'  as keyof EqState, label:'LO',  color:'#f5a561' },
        ] as const).map(({ band, label, color }) => (
          <EQFader key={band} label={label} color={color} value={deck.eq[band]} onChange={v => deck.setEqBand(band, v)} disabled={isEmpty} />
        ))}
        <div style={{ flex:1 }} />
        <label style={{ fontSize:9, color:'var(--muted)', border:'0.5px dashed var(--border)', borderRadius:4, padding:'4px 8px', cursor:'pointer', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>
          + FILE
          <input type="file" accept="audio/*" style={{ display:'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) deck.loadFile(f); e.target.value=''; }}
          />
        </label>
      </div>

      {/* Hot Cues */}
      <div style={{ padding:'4px 12px 10px', display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:4 }}>
        {HOT_CUE_LABELS.map((lbl, i) => {
          const hasPoint = deck.hotCues[i] != null;
          const color    = HOT_CUE_COLORS[i] ?? '#fff';
          return (
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <button onClick={() => hasPoint ? deck.jumpHotCue(i) : deck.setHotCue(i)}
                title={hasPoint ? `Jump to Hot Cue ${lbl} (${formatTime(deck.hotCues[i] ?? 0)})` : `Set Hot Cue ${lbl}`}
                style={{ height:28, borderRadius:4, background: hasPoint ? `${color}22` : 'transparent', border:`0.5px solid ${hasPoint ? color : 'var(--border)'}`, color: hasPoint ? color : 'var(--muted)', fontSize:10, fontWeight:700, fontFamily:'var(--font-display)', cursor:'pointer', transition:'all 0.12s', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
                {lbl}
                {hasPoint && <span style={{ fontSize:6, opacity:0.7 }}>{formatTime(deck.hotCues[i] ?? 0)}</span>}
              </button>
              {hasPoint && (
                <button onClick={() => deck.setHotCue(i, true)}
                  style={{ height:10, border:'none', background:'transparent', color:'var(--muted)', fontSize:8, cursor:'pointer', padding:0 }}>✕</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TransBtn({ children, onClick, disabled, color, active, title }: TransBtnProps): ReactElement {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ height:28, padding:'0 10px', background: active && color ? `${color}18` : 'transparent', border:`0.5px solid ${color || 'var(--border)'}`, color: color || 'var(--muted)', borderRadius:4, fontSize:10, fontFamily:'var(--font-mono)', letterSpacing:'0.06em', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1, transition:'all 0.12s', flexShrink:0 }}>
      {children}
    </button>
  );
}

function EQFader({ label, color, value, onChange, disabled }: EQFaderProps): ReactElement {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <span style={{ fontSize:8, color: value !== 0 ? color : 'var(--muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>
        {value > 0 ? `+${value}` : value}
      </span>
      <input type="range" min="-12" max="12" step="0.5" value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        onDoubleClick={() => onChange(0)}
        title={`${label} EQ: ${value > 0 ? '+' : ''}${value} dB (double-click to reset)`}
        style={{ writingMode:'vertical-lr', direction:'rtl', height:60, width:20, accentColor: color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1 }}
      />
      <span style={{ fontSize:8, color:'var(--muted)', letterSpacing:'0.06em' }}>{label}</span>
    </div>
  );
}
