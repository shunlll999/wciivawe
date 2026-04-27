import { useState, useRef, useCallback, useEffect } from 'react';
import type { DeckHandle, EqState, HotCuePoint } from '../types';
import { buildWaveData, detectBPMFromBuffer, clamp } from '../utils';

export default function useDeck(
  audioCtx: AudioContext | null,
  _deckId: 'A' | 'B',
): DeckHandle {
  // ── Audio graph refs ────────────────────────────────────────────────────
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const gainRef      = useRef<GainNode | null>(null);
  const xfadeRef     = useRef<GainNode | null>(null);
  const eqLowRef     = useRef<BiquadFilterNode | null>(null);
  const eqMidRef     = useRef<BiquadFilterNode | null>(null);
  const eqHighRef    = useRef<BiquadFilterNode | null>(null);
  const sourceRef    = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef    = useRef<AudioBuffer | null>(null);

  // ── Playback refs ───────────────────────────────────────────────────────
  const startTimeRef    = useRef(0);
  const pauseOffsetRef  = useRef(0);
  const isPlayingRef    = useRef(false);
  const cuePointRef     = useRef(0);
  const animRef         = useRef<number | null>(null);
  const loopOnRef       = useRef(false);
  const playbackRateRef = useRef(1);
  const originalBpmRef  = useRef(120);

  // ── React state ─────────────────────────────────────────────────────────
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [duration,    setDuration]    = useState(0);
  const [rawDuration, setRawDuration] = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveData,    setWaveData]    = useState<Float32Array | null>(null);
  const [liveData,    setLiveData]    = useState<Uint8Array | null>(null);
  const [fileName,    setFileName]    = useState('');
  const [bpm,         setBpmState]    = useState(120);
  const [originalBpm, setOriginalBpm] = useState(120);
  const [volume,      setVolumeState] = useState(0.8);
  const [loopOn,      setLoopOn]      = useState(false);
  const [hotCues,     setHotCues]     = useState<HotCuePoint[]>(Array(8).fill(null));
  const [eq,          setEq]          = useState<EqState>({ low: 0, mid: 0, high: 0 });
  const [isLoaded,    setIsLoaded]    = useState(false);
  const [isDragOver,  setIsDragOver]  = useState(false);

  // ── Build audio graph ───────────────────────────────────────────────────
  const initNodes = useCallback((): void => {
    if (!audioCtx || analyserRef.current) return;

    const analyser                  = audioCtx.createAnalyser();
    analyser.fftSize                = 2048;
    analyser.smoothingTimeConstant  = 0.85;

    const low              = audioCtx.createBiquadFilter();
    low.type               = 'lowshelf';
    low.frequency.value    = 250;

    const mid              = audioCtx.createBiquadFilter();
    mid.type               = 'peaking';
    mid.frequency.value    = 1000;
    mid.Q.value            = 0.7;

    const high             = audioCtx.createBiquadFilter();
    high.type              = 'highshelf';
    high.frequency.value   = 4000;

    const gain             = audioCtx.createGain();
    gain.gain.value        = 0.8;

    const xfade            = audioCtx.createGain();
    xfade.gain.value       = 1;

    analyser.connect(low);
    low.connect(mid);
    mid.connect(high);
    high.connect(gain);
    gain.connect(xfade);
    xfade.connect(audioCtx.destination);

    analyserRef.current  = analyser;
    gainRef.current      = gain;
    xfadeRef.current     = xfade;
    eqLowRef.current     = low;
    eqMidRef.current     = mid;
    eqHighRef.current    = high;
  }, [audioCtx]);

  useEffect(() => { if (audioCtx) initNodes(); }, [audioCtx, initNodes]);

  // ── Volume ──────────────────────────────────────────────────────────────
  const setVolume = useCallback((v: number): void => {
    const clamped = clamp(v, 0, 1);
    setVolumeState(clamped);
    if (gainRef.current) gainRef.current.gain.value = clamped;
  }, []);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);

  // ── EQ ──────────────────────────────────────────────────────────────────
  const setEqBand = useCallback((band: keyof EqState, db: number): void => {
    const clamped = clamp(db, -15, 15);
    setEq(prev => ({ ...prev, [band]: clamped }));
    const node =
      band === 'low'  ? eqLowRef.current  :
      band === 'mid'  ? eqMidRef.current  :
                        eqHighRef.current;
    if (node) node.gain.value = clamped;
  }, []);

  // ── BPM / playbackRate ──────────────────────────────────────────────────
  const setBpm = useCallback((newBpm: number): void => {
    const clamped = clamp(newBpm, 40, 250);
    setBpmState(clamped);
    const rate = clamped / (originalBpmRef.current || clamped);
    playbackRateRef.current = rate;
    if (sourceRef.current) {
      try { sourceRef.current.playbackRate.value = rate; } catch { /* source already stopped */ }
    }
    const raw = bufferRef.current?.duration ?? 0;
    setDuration(raw / rate);
  }, []);

  // ── Animation loop ──────────────────────────────────────────────────────
  const stopAnimation = useCallback((): void => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  // Forward ref for seekAndPlayInternal inside animate closure
  const seekRef = useRef<((offset: number) => void) | null>(null);

  const animate = useCallback((): void => {
    if (!isPlayingRef.current || !audioCtx) return;

    const rate       = playbackRateRef.current || 1;
    const rawDur     = bufferRef.current?.duration ?? 0;
    const logDur     = rawDur / rate;
    const elapsed    = (audioCtx.currentTime - startTimeRef.current) * rate + pauseOffsetRef.current;
    const prog       = Math.min(elapsed / logDur, 1);

    setProgress(prog);
    setCurrentTime(elapsed);

    const analyser = analyserRef.current;
    if (analyser) {
      const td = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(td);
      setLiveData(td);
    }

    if (prog >= 1) {
      if (loopOnRef.current) {
        seekRef.current?.(0);
      } else {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setLiveData(null);
      }
      return;
    }
    animRef.current = requestAnimationFrame(animate);
  }, [audioCtx]); // eslint-disable-line -- animate intentionally uses refs to avoid stale closure

  // ── Internal seek + play ────────────────────────────────────────────────
  const seekAndPlayInternal = useCallback((logicalOffset: number): void => {
    if (!audioCtx || !bufferRef.current || !analyserRef.current) return;

    if (sourceRef.current) { try { sourceRef.current.stop(); } catch { /* already stopped */ } }

    const rate      = playbackRateRef.current || 1;
    const rawOffset = clamp(logicalOffset / rate, 0, bufferRef.current.duration - 0.001);

    const src                   = audioCtx.createBufferSource();
    src.buffer                  = bufferRef.current;
    src.playbackRate.value      = rate;
    src.connect(analyserRef.current);

    pauseOffsetRef.current = logicalOffset;
    startTimeRef.current   = audioCtx.currentTime;
    src.start(0, rawOffset);

    sourceRef.current    = src;
    isPlayingRef.current = true;
    setIsPlaying(true);
    stopAnimation();
    animRef.current = requestAnimationFrame(animate);
  }, [audioCtx, animate, stopAnimation]);

  // Populate forward ref
  seekRef.current = seekAndPlayInternal;

  // ── loadFile ────────────────────────────────────────────────────────────
  const loadFile = useCallback((file: File, autoPlay = false): void => {
    if (!audioCtx) return;
    initNodes();
    setFileName(file.name.replace(/\.[^.]+$/, ''));
    setIsLoaded(false);

    const reader = new FileReader();
    reader.onload = (ev): void => {
      const result = ev.target?.result;
      if (!(result instanceof ArrayBuffer)) return;

      void audioCtx.decodeAudioData(result, (buf) => {
        if (isPlayingRef.current) {
          try { sourceRef.current?.stop(); } catch { /* already stopped */ }
          isPlayingRef.current = false;
          setIsPlaying(false);
          stopAnimation();
        }

        const detectedBpm         = detectBPMFromBuffer(buf);
        originalBpmRef.current    = detectedBpm;
        playbackRateRef.current   = 1;

        bufferRef.current         = buf;
        pauseOffsetRef.current    = 0;
        cuePointRef.current       = 0;

        setRawDuration(buf.duration);
        setDuration(buf.duration);
        setProgress(0);
        setCurrentTime(0);
        setLiveData(null);
        setWaveData(buildWaveData(buf));
        setBpmState(detectedBpm);
        setOriginalBpm(detectedBpm);
        setHotCues(Array(8).fill(null));
        setIsLoaded(true);

        if (autoPlay) {
          setTimeout(() => seekAndPlayInternal(0), 30);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }, [audioCtx, initNodes, stopAnimation, seekAndPlayInternal]);

  // ── togglePlay ──────────────────────────────────────────────────────────
  const togglePlay = useCallback((): void => {
    if (!bufferRef.current || !audioCtx) return;
    if (isPlayingRef.current) {
      const rate = playbackRateRef.current || 1;
      pauseOffsetRef.current =
        (audioCtx.currentTime - startTimeRef.current) * rate + pauseOffsetRef.current;
      try { sourceRef.current?.stop(); } catch { /* already stopped */ }
      isPlayingRef.current = false;
      setIsPlaying(false);
      setLiveData(null);
      stopAnimation();
    } else {
      seekAndPlayInternal(pauseOffsetRef.current);
    }
  }, [audioCtx, seekAndPlayInternal, stopAnimation]);

  // ── seek ────────────────────────────────────────────────────────────────
  const seek = useCallback((ratio: number): void => {
    const rate   = playbackRateRef.current || 1;
    const logDur = (bufferRef.current?.duration ?? 0) / rate;
    const t      = ratio * logDur;
    if (isPlayingRef.current) {
      seekAndPlayInternal(t);
    } else {
      pauseOffsetRef.current = t;
      setProgress(ratio);
      setCurrentTime(t);
    }
  }, [seekAndPlayInternal]);

  // ── cue ─────────────────────────────────────────────────────────────────
  const cue = useCallback((): void => {
    if (!bufferRef.current || !audioCtx) return;
    if (isPlayingRef.current) {
      const rate = playbackRateRef.current || 1;
      const logical =
        (audioCtx.currentTime - startTimeRef.current) * rate + pauseOffsetRef.current;
      cuePointRef.current    = logical;
      pauseOffsetRef.current = logical;
      try { sourceRef.current?.stop(); } catch { /* already stopped */ }
      isPlayingRef.current = false;
      setIsPlaying(false);
      setLiveData(null);
      stopAnimation();
    } else {
      seekAndPlayInternal(cuePointRef.current);
    }
  }, [audioCtx, seekAndPlayInternal, stopAnimation]);

  // ── toggleLoop ──────────────────────────────────────────────────────────
  const toggleLoop = useCallback((): void => {
    setLoopOn(v => { loopOnRef.current = !v; return !v; });
  }, []);

  // ── hot cues ────────────────────────────────────────────────────────────
  const setHotCue = useCallback((idx: number, clear = false): void => {
    if (clear) {
      setHotCues(p => { const n = [...p]; n[idx] = null; return n; });
      return;
    }
    const rate    = playbackRateRef.current || 1;
    const logical = isPlayingRef.current && audioCtx
      ? (audioCtx.currentTime - startTimeRef.current) * rate + pauseOffsetRef.current
      : pauseOffsetRef.current;
    setHotCues(p => { const n = [...p]; n[idx] = logical; return n; });
  }, [audioCtx]);

  const jumpHotCue = useCallback((idx: number): void => {
    setHotCues(prev => {
      const t = prev[idx];
      if (t === null || t === undefined) return prev;
      if (isPlayingRef.current) {
        seekAndPlayInternal(t);
      } else {
        const rate   = playbackRateRef.current || 1;
        const logDur = (bufferRef.current?.duration ?? 1) / rate;
        pauseOffsetRef.current = t;
        setProgress(t / logDur);
        setCurrentTime(t);
      }
      return prev;
    });
  }, [seekAndPlayInternal]);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  // ── Return handle ───────────────────────────────────────────────────────
  return {
    isPlaying, duration, rawDuration, progress, currentTime,
    waveData, liveData, fileName, bpm, originalBpm, volume, loopOn,
    hotCues, eq, isLoaded, isDragOver,
    setVolume, setEqBand, setBpm, setIsDragOver,
    loadFile, togglePlay, seek, cue, toggleLoop, setHotCue, jumpHotCue,
    _setCrossfaderGain: (v: number): void => {
      if (xfadeRef.current) xfadeRef.current.gain.value = clamp(v, 0, 1);
    },
  };
}
