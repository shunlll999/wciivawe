// ── Firebase (ต้อง init ก่อน component ใดๆ) ──────────────────────────
import './firebase';
import React, {
  useState, useRef, useEffect, useCallback, createContext,
  Fragment,
} from 'react';
import type { ReactElement, ReactNode } from 'react';
import Deck from './components/Deck';
import Playlist from './components/Playlist';
import TheoryPanel from './components/TheoryPanel';
import ChordRow from './components/ChordRow';
import PianoRoll from './components/PianoRoll';
import MIDIStatusBar from './components/MIDIStatusBar';
import useDeck from './hooks/useDeck';
import useMIDI, { CONTROLLER_PRESETS } from './hooks/useMIDI';
import { TIME_SIGNATURES, NOTE_NAMES } from './musicTheory';
import type { DeckId, BarInfo, RootKeyIndex, ScaleName } from './types';

// ─── Audio context ────────────────────────────────────────────────────────────

interface AudioCtxValue {
  audioCtx: AudioContext | null;
  ensureAudio(): AudioContext;
}

export const AudioCtxContext = createContext<AudioCtxValue>({
  audioCtx: null,
  ensureAudio: () => { throw new Error('AudioCtxContext not initialised'); },
});

function useSharedAudio(): AudioCtxValue {
  const ctxRef = useRef<AudioContext | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const ensureAudio = useCallback((): AudioContext => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor = window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) throw new Error('AudioContext not supported');
    const ctx       = new Ctor();
    ctxRef.current  = ctx;
    setAudioCtx(ctx);
    return ctx;
  }, []);

  return { audioCtx, ensureAudio };
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App(): ReactElement {
  const audioCtxValue = useSharedAudio();
  const { audioCtx, ensureAudio } = audioCtxValue;

  const deckA = useDeck(audioCtx, 'A');
  const deckB = useDeck(audioCtx, 'B');
  const decks = [deckA, deckB] as const;

  const [activeDeck,  setActiveDeck]  = useState<DeckId>('A');
  const [rootKey,     setRootKey]     = useState<RootKeyIndex>(0);
  const [scaleName,   setScaleName]   = useState<ScaleName>('major');
  const [timeSigIdx,  setTimeSigIdx]  = useState(0);
  const [barInfoA,    setBarInfoA]    = useState<BarInfo>({ currentBar:1, totalBars:1, currentBeat:1 });
  const [barInfoB,    setBarInfoB]    = useState<BarInfo>({ currentBar:1, totalBars:1, currentBeat:1 });
  const [crossfader,  setCrossfader]  = useState(0.5);

  /** The last file the user highlighted in the playlist */
  const selectedTrackRef = useRef<File | null>(null);

  // ── Crossfader gain ────────────────────────────────────────────────────
  useEffect(() => {
    const volA = crossfader <= 0.5 ? 1 : 1 - (crossfader - 0.5) * 2;
    const volB = crossfader >= 0.5 ? 1 : crossfader * 2;
    deckA._setCrossfaderGain(volA);
    deckB._setCrossfaderGain(volB);
  // eslint-disable-next-line -- crossfader effect intentionally omits deck refs
  }, [crossfader]);

  // ── Load file into a specific deck (no autoplay) ───────────────────────
  const loadIntoDeck = useCallback((deckId: DeckId, file: File): void => {
    ensureAudio();
    setTimeout(() => {
      const deck = deckId === 'A' ? deckA : deckB;
      deck.loadFile(file, false);
      setActiveDeck(deckId);
    }, 50);
  }, [deckA, deckB, ensureAudio]);

  // ── Playlist single-click: load to preferred deck ──────────────────────
  const handlePlaylistSelect = useCallback((file: File, preferDeck: DeckId): void => {
    selectedTrackRef.current = file;
    loadIntoDeck(preferDeck, file);
  }, [loadIntoDeck]);

  // ── Global keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Ignore when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.shiftKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const file = selectedTrackRef.current;
          if (file) loadIntoDeck('A', file);
          else setActiveDeck('A');
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const file = selectedTrackRef.current;
          if (file) loadIntoDeck('B', file);
          else setActiveDeck('B');
        }
        if (e.key === ' ') {
          e.preventDefault();
          (activeDeck === 'A' ? deckA : deckB).togglePlay();
        }
        if (e.key.toUpperCase() === 'A') setActiveDeck('A');
        if (e.key.toUpperCase() === 'B') setActiveDeck('B');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeDeck, deckA, deckB, loadIntoDeck]);

  // ── MIDI ────────────────────────────────────────────────────────────────
  const midi = useMIDI({
    deckOrigBpms:  [deckA.originalBpm, deckB.originalBpm],
    onDeckPlay:    (di) => decks[di]?.togglePlay(),
    onDeckCue:     (di) => decks[di]?.cue(),
    onDeckBpm:     (di, bpm) => decks[di]?.setBpm(bpm),
    onDeckVolume:  (di, v)   => decks[di]?.setVolume(v),
    onDeckEqHigh:  (di, db)  => decks[di]?.setEqBand('high', db),
    onDeckEqMid:   (di, db)  => decks[di]?.setEqBand('mid', db),
    onDeckEqLow:   (di, db)  => decks[di]?.setEqBand('low', db),
    onDeckHotCue:  (di, idx) => decks[di]?.jumpHotCue(idx),
    onCrossfader:  (v) => setCrossfader(v),
    onPlay:        () => (activeDeck === 'A' ? deckA : deckB).togglePlay(),
    onCue:         () => (activeDeck === 'A' ? deckA : deckB).cue(),
    onBpm:         (v) => (activeDeck === 'A' ? deckA : deckB).setBpm(v),
    onFilterLow:   () => {},
    onFilterMid:   () => {},
    onFilterHigh:  () => {},
    onHotCue:      (i) => (activeDeck === 'A' ? deckA : deckB).jumpHotCue(i),
  });

  const activeDeckObj  = activeDeck === 'A' ? deckA : deckB;
  const activeBarInfo  = activeDeck === 'A' ? barInfoA : barInfoB;
  const timeSig = TIME_SIGNATURES[timeSigIdx] ?? TIME_SIGNATURES[0]!;

  return (
    <div style={{ display: 'block', margin: '0 auto 20px' }}>
  <div>
        <img src='/assets/logo/wachiii-logo.png' width={100} alt='wachiii' />
        <p style={{
          fontSize: 11, color: 'var(--muted)', margin: '0.5rem 0 1rem', lineHeight: 1.4,
        textAlign: 'justify',
        }}>Welcome to the WCIIVAWE visualizer! This is a web-based application designed to analyze and visualize audio files, providing insights into their musical structure and theory. You can upload your own audio files to see their waveforms, bar grids, piano rolls, and diatonic chords. Explore the theory mode to understand the underlying musical concepts of your tracks. Enjoy experimenting with your music in a whole new way!</p>
      </div>
    <AudioCtxContext.Provider value={audioCtxValue}>
      <div style={{ background:'var(--bg)', borderRadius:16, border:'0.5px solid var(--border)', overflow:'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background:'var(--surface)', padding:'11px 18px', display:'flex', alignItems:'center', gap:8, borderBottom:'0.5px solid var(--border)', flexWrap:'wrap' }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'var(--accent)', letterSpacing:'0.05em' }}>WCII VISUALIZER</span>
          <span style={{ fontSize:9, padding:'2px 8px', borderRadius:4, background:'rgba(200,245,97,0.1)', border:'0.5px solid rgba(200,245,97,0.3)', color:'var(--accent)', letterSpacing:'0.08em' }}>DUAL DECK · TS</span>

          <div style={{ display:'flex', gap:4 }}>
            {(['A','B'] as DeckId[]).map(id => {
              const col   = id === 'A' ? '#c8f561' : '#61c8f5';
              const isAct = activeDeck === id;
              return (
                <button key={id} onClick={() => setActiveDeck(id)}
                  title={`Focus Deck ${id} — MIDI CH ${id==='A'?'1':'2'}`}
                  style={{ width:26, height:20, borderRadius:4, fontSize:10, fontWeight:700, fontFamily:'var(--font-display)', cursor:'pointer', background: isAct ? `${col}22` : 'transparent', border:`0.5px solid ${isAct?col:'var(--border)'}`, color: isAct?col:'var(--muted)', transition:'all 0.15s' }}
                >{id}</button>
              );
            })}
          </div>

          <div style={{ marginLeft:'auto', fontSize:9, color:'var(--muted)', fontFamily:'var(--font-mono)', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <span><kbd style={kbdS}>↑↓</kbd> browse playlist</span>
            <span><kbd style={kbdS}>SHIFT+←</kbd> Load→A</span>
            <span><kbd style={kbdS}>SHIFT+→</kbd> Load→B</span>
            <span><kbd style={kbdS}>SHIFT+Space</kbd> Play</span>
          </div>
        </div>

        {/* ── Theory ── */}
        <TheoryPanel
          rootKey={rootKey}       setRootKey={setRootKey}
          scaleName={scaleName}   setScaleName={setScaleName}
          bpm={activeDeckObj.bpm} setBpm={activeDeckObj.setBpm}
          timeSigIdx={timeSigIdx} setTimeSigIdx={setTimeSigIdx}
          barInfo={activeBarInfo}
        />

        {/* ── Decks ── */}
        <div style={{ display:'flex', gap:8, padding:'10px 12px 8px' }}>
          <Deck deckId="A" deck={deckA} timeSig={timeSig}
            onBarInfo={setBarInfoA} isActive={activeDeck==='A'} onActivate={() => setActiveDeck('A')} />
          <Deck deckId="B" deck={deckB} timeSig={timeSig}
            onBarInfo={setBarInfoB} isActive={activeDeck==='B'} onActivate={() => setActiveDeck('B')} />
        </div>

        {/* ── Crossfader ── */}
        <div style={{ padding:'2px 20px 10px', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:9, color:'#c8f561', fontFamily:'var(--font-mono)', width:14 }}>A</span>
          <div style={{ position:'relative', flex:1 }}>
            <input type="range" min="0" max="1" step="0.005"
              value={crossfader}
              onChange={e => setCrossfader(parseFloat(e.target.value))}
              onDoubleClick={() => setCrossfader(0.5)}
              title="Crossfader (double-click = center)"
              style={{ width:'100%' }}
            />
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:1, height:10, background:'var(--border)', pointerEvents:'none' }} />
          </div>
          <span style={{ fontSize:9, color:'#61c8f5', fontFamily:'var(--font-mono)', width:14, textAlign:'right' }}>B</span>
          <button onClick={() => setCrossfader(0.5)} style={{ fontSize:9, color:'var(--muted)', background:'transparent', border:'0.5px solid var(--border)', borderRadius:3, padding:'2px 8px', cursor:'pointer', fontFamily:'var(--font-mono)' }}>CENTER</button>
        </div>

        {/* ── Piano Roll + Chords ── */}
        <div style={{ padding:'0 20px 3px' }}>
          <SL>Key: {NOTE_NAMES[rootKey]} {scaleName}</SL>
        </div>
        <div style={{ padding:'0 20px 8px', overflowX:'auto' }}>
          <PianoRoll rootKey={rootKey} scaleName={scaleName} />
        </div>
        <div style={{ padding:'2px 20px 3px' }}><SL>Diatonic Chords</SL></div>
        <ChordRow rootKey={rootKey} scaleName={scaleName} />

        {/* ── MIDI ── */}
        <MIDIStatusBar midi={midi} activeDeck={activeDeck} presets={CONTROLLER_PRESETS} />

        {/* ── Playlist ── */}
        <Playlist
          currentFileNameA={deckA.fileName}
          currentFileNameB={deckB.fileName}
          onSelect={handlePlaylistSelect}
          onLoadToDeck={loadIntoDeck}
          onTrackHighlight={(file: File) => { selectedTrackRef.current = file; }}
        />
      </div>
    </AudioCtxContext.Provider>
      <p style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', marginTop: 16 }}>
        &copy; 2026 WCIIVAWE. All rights reserved. <strong>WCIIVAWE</strong> is a project by <a href='https://wachiii-dev0.web.app/' target='_blank' rel='noopener noreferrer' style={{ color: 'var(--accent)' }}>wachiii</a> and belongs to <a href='https://wachiii.web.app/' target='_blank' rel='noopener noreferrer' style={{ color: 'var(--accent)' }}>wciibuilder</a>.
      </p>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const kbdS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border)',
  borderRadius: 3, padding: '1px 5px', fontSize: 9, fontFamily: 'var(--font-mono)',
};

function SL({ children }: { children: ReactNode }): ReactElement {
  return (
    <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:7 }}>
      {children}
    </div>
  );
}
