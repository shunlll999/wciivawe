import React, { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import WaveformCanvas from './components/WaveformCanvas';
import BarGrid from './components/BarGrid';
import PianoRoll from './components/PianoRoll';
import TheoryPanel from './components/TheoryPanel';
import ChordRow from './components/ChordRow';
import MIDIPanel from './components/MIDIPanel';
import useMIDI from './hooks/useMIDI';
import { detectBPMFromBuffer, buildWaveData, formatTime, TIME_SIGNATURES } from './musicTheory';

const HOT_CUE_COLORS = ['#f561c8','#61f5c8','#c8f561','#f5a561','#6185f5','#f56161','#a061f5','#61d5f5'];

export default function App() {
  // ── Audio refs ──────────────────────────────────────────────────────────
  const audioCtxRef    = useRef(null);
  const analyserRef    = useRef(null);
  const gainRef        = useRef(null);
  const sourceRef      = useRef(null);
  const bufferRef      = useRef(null);
  const animRef        = useRef(null);
  const startTimeRef   = useRef(0);
  const pauseOffsetRef = useRef(0);
  const isPlayingRef   = useRef(false);
  const lastBeatRef    = useRef(-1);
  const cuePointRef    = useRef(0);

  // ── Audio state ─────────────────────────────────────────────────────────
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [duration,    setDuration]    = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveData,    setWaveData]    = useState(null);
  const [liveData,    setLiveData]    = useState(null);
  const [fileName,    setFileName]    = useState('');
  const [isDragging,  setIsDragging]  = useState(false);
  const [loopOn,      setLoopOn]      = useState(false);
  const [metroOn,     setMetroOn]     = useState(false);
  const [volume,      setVolume]      = useState(0.8);

  // ── Theory state ────────────────────────────────────────────────────────
  const [rootKey,    setRootKey]    = useState(0);
  const [scaleName,  setScaleName]  = useState('major');
  const [bpm,        setBpm]        = useState(120);
  const [timeSigIdx, setTimeSigIdx] = useState(0);
  const [barInfo,    setBarInfo]    = useState({ currentBar: 1, totalBars: 1, currentBeat: 1 });

  // ── Hot Cues ────────────────────────────────────────────────────────────
  const [hotCuePoints, setHotCuePoints] = useState(Array(8).fill(null));

  // ── Audio init ───────────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    const ctx     = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.85;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    analyser.connect(gain);
    gain.connect(ctx.destination);
    audioCtxRef.current  = ctx;
    analyserRef.current  = analyser;
    gainRef.current      = gain;
  }, [volume]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  // ── Animation loop ───────────────────────────────────────────────────────
  const stopAnimation = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }, []);

  const loopOnRef  = useRef(loopOn);
  const metroOnRef = useRef(metroOn);
  const bpmRef     = useRef(bpm);
  useEffect(() => { loopOnRef.current  = loopOn;  }, [loopOn]);
  useEffect(() => { metroOnRef.current = metroOn; }, [metroOn]);
  useEffect(() => { bpmRef.current     = bpm;     }, [bpm]);

  const animate = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx      = audioCtxRef.current;
    const analyser = analyserRef.current;
    const dur      = bufferRef.current?.duration || 0;
    const elapsed  = ctx.currentTime - startTimeRef.current + pauseOffsetRef.current;
    const prog     = Math.min(elapsed / dur, 1);

    setProgress(prog);
    setCurrentTime(elapsed);

    const td = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(td);
    setLiveData(Array.from(td));

    if (metroOnRef.current) {
      const beat = Math.floor(elapsed / (60 / bpmRef.current));
      if (beat !== lastBeatRef.current) lastBeatRef.current = beat;
    }

    if (prog >= 1) {
      if (loopOnRef.current) { seekAndPlayFn(0); }
      else { isPlayingRef.current = false; setIsPlaying(false); setLiveData(null); }
      return;
    }
    animRef.current = requestAnimationFrame(animate);
  }, []); // eslint-disable-line

  // keep seekAndPlay accessible inside animate without closure issues
  const seekAndPlayRef = useRef(null);

  const seekAndPlay = useCallback((offset) => {
    const ctx      = audioCtxRef.current;
    const analyser = analyserRef.current;
    const buf      = bufferRef.current;
    if (!buf || !ctx) return;
    if (sourceRef.current) { try { sourceRef.current.stop(); } catch (_) {} }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(analyser);
    pauseOffsetRef.current = Math.max(0, Math.min(offset, buf.duration - 0.01));
    startTimeRef.current   = ctx.currentTime;
    src.start(0, pauseOffsetRef.current);
    sourceRef.current    = src;
    isPlayingRef.current = true;
    setIsPlaying(true);
    stopAnimation();
    animRef.current = requestAnimationFrame(animate);
  }, [animate, stopAnimation]);

  // make seekAndPlay available in the animate closure via ref
  function seekAndPlayFn(offset) { seekAndPlay(offset); }
  seekAndPlayRef.current = seekAndPlay;

  // ── Toggle play ──────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!bufferRef.current) return;
    initAudio();
    if (isPlayingRef.current) {
      pauseOffsetRef.current += audioCtxRef.current.currentTime - startTimeRef.current;
      try { sourceRef.current?.stop(); } catch (_) {}
      isPlayingRef.current = false;
      setIsPlaying(false);
      setLiveData(null);
      stopAnimation();
    } else {
      seekAndPlay(pauseOffsetRef.current);
    }
  }, [initAudio, seekAndPlay, stopAnimation]);

  // ── CUE ─────────────────────────────────────────────────────────────────
  const handleCue = useCallback(() => {
    if (!bufferRef.current) return;
    initAudio();
    if (isPlayingRef.current) {
      // set cue point and pause
      const elapsed = audioCtxRef.current.currentTime - startTimeRef.current + pauseOffsetRef.current;
      cuePointRef.current = elapsed;
      pauseOffsetRef.current += audioCtxRef.current.currentTime - startTimeRef.current;
      try { sourceRef.current?.stop(); } catch (_) {}
      isPlayingRef.current = false;
      setIsPlaying(false);
      setLiveData(null);
      stopAnimation();
    } else {
      seekAndPlay(cuePointRef.current);
    }
  }, [initAudio, seekAndPlay, stopAnimation]);

  // ── Hot Cues ─────────────────────────────────────────────────────────────
  const handleHotCueSet = useCallback((idx, clear = false) => {
    if (clear) {
      setHotCuePoints(prev => { const n = [...prev]; n[idx] = null; return n; });
      return;
    }
    const t = isPlayingRef.current
      ? audioCtxRef.current.currentTime - startTimeRef.current + pauseOffsetRef.current
      : pauseOffsetRef.current;
    setHotCuePoints(prev => { const n = [...prev]; n[idx] = t; return n; });
  }, []);

  const handleHotCueJump = useCallback((idx) => {
    const t = hotCuePoints[idx];
    if (t == null) return;
    initAudio();
    if (isPlayingRef.current) {
      seekAndPlay(t);
    } else {
      pauseOffsetRef.current = t;
      const dur = bufferRef.current?.duration || 1;
      setProgress(t / dur);
      setCurrentTime(t);
    }
  }, [hotCuePoints, initAudio, seekAndPlay]);

  // ── Load file ────────────────────────────────────────────────────────────
  const loadFile = useCallback((file) => {
    if (!file) return;
    initAudio();
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      audioCtxRef.current.decodeAudioData(ev.target.result, (buf) => {
        bufferRef.current = buf;
        setDuration(buf.duration);
        setProgress(0);
        setCurrentTime(0);
        pauseOffsetRef.current = 0;
        cuePointRef.current    = 0;
        setWaveData(Array.from(buildWaveData(buf)));
        setBpm(detectBPMFromBuffer(buf));
      });
    };
    reader.readAsArrayBuffer(file);
  }, [initAudio]);

  const handleSeek = useCallback((e) => {
    if (!duration) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    const t     = ratio * duration;
    if (isPlayingRef.current) seekAndPlay(t);
    else { pauseOffsetRef.current = t; setProgress(ratio); setCurrentTime(t); }
  }, [duration, seekAndPlay]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('audio/')) loadFile(file);
  }, [loadFile]);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  // ── MIDI hook ────────────────────────────────────────────────────────────
  const midi = useMIDI({
    onPlay:       togglePlay,
    onCue:        handleCue,
    onBpm:        setBpm,
    onFilterLow:  () => {},
    onFilterMid:  () => {},
    onFilterHigh: () => {},
    onHotCue:     handleHotCueJump,
  });

  const hasAudio = !!waveData;

  return (
    <Fragment>
      <div>
        <img src='/assets/logo/wachiii-logo.png' width={100} alt='wachiii' />
        <p style={{
          fontSize: 11, color: 'var(--muted)', margin: '0.5rem 0 1rem', lineHeight: 1.4,
        textAlign: 'justify',
        }}>Welcome to the WCIIVAWE visualizer! This is a web-based application designed to analyze and visualize audio files, providing insights into their musical structure and theory. You can upload your own audio files to see their waveforms, bar grids, piano rolls, and diatonic chords. Explore the theory mode to understand the underlying musical concepts of your tracks. Enjoy experimenting with your music in a whole new way!</p>
      </div>
      <div style={{ background: 'var(--bg)', borderRadius: 16, border: '0.5px solid var(--border)', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ background: 'var(--surface)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '0.5px solid var(--border)' }}>
          <StatusDot active={isPlaying} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>WCII VISUALIZER</span>
          <span style={{ background: 'rgba(200,245,97,0.1)', border: '0.5px solid rgba(200,245,97,0.3)', color: 'var(--accent)', fontSize: 9, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.08em' }}>THEORY MODE</span>
          {fileName && <span style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{fileName}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}>VOL</span>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} style={{ width: 64 }} />
          </div>
        </div>

        {/* ── Theory ── */}
        <TheoryPanel rootKey={rootKey} setRootKey={setRootKey} scaleName={scaleName} setScaleName={setScaleName} bpm={bpm} setBpm={setBpm} timeSigIdx={timeSigIdx} setTimeSigIdx={setTimeSigIdx} barInfo={barInfo} />

        {/* ── Waveform ── */}
        <div style={{ padding: '14px 20px 8px' }}>
          <SectionLabel>Waveform</SectionLabel>
          <WaveformCanvas waveData={waveData} liveData={liveData} progress={progress} />
        </div>

        {/* ── Bar Grid ── */}
        <div style={{ padding: '4px 20px 12px' }}>
          <SectionLabel>Bar / Measure Grid</SectionLabel>
          <BarGrid duration={duration} bpm={bpm} timeSig={TIME_SIGNATURES[timeSigIdx]} progress={progress} onBarInfo={setBarInfo} />
        </div>

        {/* ── Transport ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', background: 'var(--surface)' }}>
          {/* CUE */}
          <button onClick={handleCue} disabled={!hasAudio} style={{ height: 38, padding: '0 14px', borderRadius: 6, background: 'transparent', border: '0.5px solid var(--accent3)', color: 'var(--accent3)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', cursor: hasAudio ? 'pointer' : 'not-allowed', opacity: hasAudio ? 1 : 0.4, flexShrink: 0 }}>
            CUE
          </button>

          {/* Play/Pause */}
          <button onClick={togglePlay} style={{ width: 38, height: 38, borderRadius: '50%', background: hasAudio ? 'var(--accent)' : 'rgba(200,245,97,0.2)', border: 'none', cursor: hasAudio ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.1s' }}
            onMouseEnter={e => { if (hasAudio) e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--bg)">
              {isPlaying ? <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></> : <polygon points="5,3 19,12 5,21"/>}
            </svg>
          </button>

          {/* Progress + hot cue markers */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div onClick={handleSeek} style={{ height: 4, background: 'var(--border)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
              <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.05s linear' }} />
              {hotCuePoints.map((pt, i) => pt != null && duration > 0 ? (
                <div key={i} onClick={e => { e.stopPropagation(); handleHotCueJump(i); }}
                  style={{ position: 'absolute', top: -3, left: `${(pt / duration) * 100}%`, width: 2, height: 10, background: HOT_CUE_COLORS[i], borderRadius: 1, cursor: 'pointer', transform: 'translateX(-50%)' }}
                  title={`Hot Cue ${String.fromCharCode(65+i)}`}
                />
              ) : null)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <SmallBtn active={loopOn} onClick={() => setLoopOn(!loopOn)}>LOOP</SmallBtn>
          <SmallBtn active={metroOn} onClick={() => setMetroOn(!metroOn)}>METRO</SmallBtn>
        </div>

        {/* ── Upload ── */}
        <div onClick={() => document.getElementById('fileInput').click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{ margin: '12px 20px', border: `0.5px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(200,245,97,0.04)' : 'var(--surface)', transition: 'all 0.2s' }}
        >
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Drop audio or <span style={{ color: 'var(--accent)' }}>browse</span></div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>MP3 · WAV · OGG · FLAC</div>
          <input id="fileInput" type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => loadFile(e.target.files[0])} />
        </div>

        {/* ── Piano Roll ── */}
        <div style={{ padding: '0 20px 4px' }}><SectionLabel>Key Piano Roll</SectionLabel></div>
        <div style={{ padding: '0 20px 8px', overflowX: 'auto' }}><PianoRoll rootKey={rootKey} scaleName={scaleName} /></div>

        {/* ── Chords ── */}
        <div style={{ padding: '4px 20px 4px' }}><SectionLabel>Diatonic Chords</SectionLabel></div>
        <ChordRow rootKey={rootKey} scaleName={scaleName} />

        {/* ── MIDI Panel ── */}
        <MIDIPanel {...midi} hotCuePoints={hotCuePoints} onHotCueSet={handleHotCueSet} onHotCueJump={handleHotCueJump} />
      </div>
      <p style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', marginTop: 16 }}>
        &copy; 2026 WCIIVAWE. All rights reserved. <strong>WCIIVAWE</strong> is a project by <a href='https://wachiii-dev0.web.app/' target='_blank' rel='noopener noreferrer' style={{ color: 'var(--accent)' }}>wachiii</a> and belongs to <a href='https://wachiii.web.app/' target='_blank' rel='noopener noreferrer' style={{ color: 'var(--accent)' }}>wciibuilder</a>.
      </p>
    </Fragment>
  );
}

function StatusDot({ active }) {
  return <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? 'var(--accent)' : 'var(--muted)', boxShadow: active ? '0 0 6px var(--accent)' : 'none', transition: 'all 0.2s', flexShrink: 0 }} />;
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7 }}>{children}</div>;
}

function SmallBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: active ? 'rgba(97,245,200,0.07)' : 'transparent', border: active ? '0.5px solid var(--accent2)' : '0.5px solid var(--border)', color: active ? 'var(--accent2)' : 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-mono)', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.06em' }}>
      {children}
    </button>
  );
}
