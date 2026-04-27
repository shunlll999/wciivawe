import React, { useRef, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import type { TimeSig, BarInfo } from '../types';

interface BarGridProps {
  duration:    number;
  bpm:         number;
  timeSig:     TimeSig;
  progress:    number;
  onBarInfo?:  (info: BarInfo) => void;
  accentColor?: string;
}

export default function BarGrid({
  duration, bpm, timeSig, progress, onBarInfo, accentColor = '#c8f561',
}: BarGridProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hexToRgb = (hex: string): string => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `${r},${g},${b}`;
  };

  const draw = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W   = canvas.width;
    const H   = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const rgb = hexToRgb(accentColor.startsWith('#') ? accentColor : '#c8f561');

    ctx.clearRect(0, 0, W, H);
    if (!duration) return;

    const beatsPerBar = timeSig.beats;
    const secPerBeat  = 60 / bpm;
    const secPerBar   = secPerBeat * beatsPerBar;
    const totalBars   = Math.ceil(duration / secPerBar);
    const barW        = W / totalBars;
    const currentTime = progress * duration;
    const currentBar  = Math.floor(currentTime / secPerBar);
    const currentBeat = Math.floor((currentTime % secPerBar) / secPerBeat);

    onBarInfo?.({ currentBar: currentBar + 1, totalBars, currentBeat: currentBeat + 1 });

    for (let b = 0; b < totalBars; b++) {
      const x         = b * barW;
      const isCurrent = b === currentBar;
      const isPast    = b < currentBar;

      ctx.fillStyle = isCurrent ? `rgba(${rgb},0.12)` : isPast ? `rgba(${rgb},0.04)` : 'transparent';
      ctx.fillRect(x + 0.5, 0, barW - 1, H);

      ctx.strokeStyle = isCurrent ? `rgba(${rgb},0.85)` : `rgba(${rgb},0.22)`;
      ctx.lineWidth   = isCurrent ? 1.5 * dpr : 0.5 * dpr;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();

      for (let beat = 1; beat < beatsPerBar; beat++) {
        const bx           = x + (beat / beatsPerBar) * barW;
        const isCurrentBeat = isCurrent && beat === currentBeat;
        ctx.strokeStyle = isCurrentBeat ? `rgba(${rgb},0.5)` : `rgba(${rgb},0.18)`;
        ctx.lineWidth   = 0.5 * dpr;
        ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(bx, H * 0.25); ctx.lineTo(bx, H * 0.75); ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isCurrent) {
        const beatFrac   = (currentTime % secPerBar) / secPerBar;
        const beatX      = x + beatFrac * barW;
        const beatBlockW = Math.max(2, (barW / beatsPerBar) * 0.7);
        ctx.fillStyle = 'rgba(245,97,200,0.75)';
        ctx.beginPath();
        if ((ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void }).roundRect) {
          (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(beatX - beatBlockW / 2, H * 0.15, beatBlockW, H * 0.7, 2);
        } else {
          ctx.rect(beatX - beatBlockW / 2, H * 0.15, beatBlockW, H * 0.7);
        }
        ctx.fill();
      }

      if (barW > 18 && totalBars <= 48) {
        ctx.fillStyle = isCurrent ? `rgba(${rgb},0.9)` : `rgba(${rgb},0.28)`;
        ctx.font      = `${Math.max(7, 8) * dpr}px 'Space Mono', monospace`;
        ctx.fillText(String(b + 1), x + 3, H - 5 * dpr);
      }
    }

    ctx.strokeStyle = `rgba(${rgb},0.22)`;
    ctx.lineWidth   = 0.5 * dpr;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(W - 0.5, 0); ctx.lineTo(W - 0.5, H); ctx.stroke();
  }, [duration, bpm, timeSig, progress, onBarInfo, accentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr    = window.devicePixelRatio || 1;
    const resize = (): void => {
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas ref={canvasRef} style={{ width:'100%', height:60, display:'block', borderRadius:6, background:'var(--surface)', border:'0.5px solid var(--border)' }} />
  );
}
